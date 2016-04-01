/*
TO DO:
    [ ] - Ambigious terms...
    [ ] - Get locations for places
*/

keyterms = [ ];
progress = {
    'csvParse': false,
    'wikipedia': {
        'defined': false,
        'imaged':  false,
        'located': false,
        'definedTerms':   [ ],
        'imagedTerms':    [ ],
        'locatedTerms':   [ ],
        'ambiguousTerms': [ ],
        'invalidTerms':   [ ]
    }
};

$(function() {
    $('#submit-parse').click(function() {
        parse_files();   
    });
});

function parse_files() {
    var files = $('#files')[0].files;
    var config = {
        delimiter:        ",",
        newline:          "\n",
        header:           undefined,
        dynamicTyping:    undefined,
        preview:          undefined,
        step:             undefined,
        encoding:         undefined,
        worker:           undefined,
        comments:         undefined,
        complete:         completeFn,
        error:            errorFn,
        download:         undefined,
        fastMode:         undefined,
        skipEmptyLines:   undefined,
        chunk:            undefined,
        beforeFirstChunk: undefined,
    }

    if (files.length > 0) {
        for (i = 0; i < files.length; i++) {
            var filename = files[i].name;
            var fileext  = filename.substr(filename.lastIndexOf('.') + 1);

            if (files[i].size > 1024 * 1024 * 10){
                alert('The selected file "' + filename + '" is larger than 10 MB. Please choose a smaller file to prevent your browser from crashing.');
                return;
            } else if (fileext != 'csv') {
                alert('The selected file "' + filename + '" is not a .csv file. Please choose select a .csv file to parse.');
                return;
            }
        }
          
        $('#files').parse({
            config: config,
            complete: function() {

                /* REMOVE */
                $('#csv_parse_progress').toggleClass('loading done');
                /* end of REMOVE */

                progress.csvParse = true;

                for (var i = 0; i < keyterms.length; i++) {
                    getWikipediaDefinition(keyterms, i);
                }

                checkWikipediaDefinitionProgress = setInterval(function() {
                    if (progress.wikipedia.definedTerms.length + 
                        progress.wikipedia.invalidTerms.length +
                        progress.wikipedia.ambiguousTerms.length == keyterms.length) {

                        /* REMOVE */
                        $('#wikipedia_def_progress').toggleClass('loading done');
                        /* end of REMOVE */

                        progress.wikipedia.defined = true;
                        clearInterval(checkWikipediaDefinitionProgress);

                        terms_to_locate = 0;

                        for (var i = 0; i < progress.wikipedia.definedTerms.length; i++) {
                            ix = progress.wikipedia.definedTerms[i];
                            getWikipediaImages(keyterms, ix);

                            if (keyterms[ix].type == "location") {
                                getWikipediaLocation(keyterms, ix);
                            }
                        }

                        checkWikipediaImageProgress = setInterval(function() {
                            if (progress.wikipedia.imagedTerms.length == progress.wikipedia.definedTerms.length) {

                                /* REMOVE */
                                $('#wikipedia_img_progress').toggleClass('loading done');
                                /* end of REMOVE */

                                progress.wikipedia.imaged = true;
                                clearInterval(checkWikipediaImageProgress);
                            }
                        });

                        checkWikipediaLocationProgress = setInterval(function() {
                            if (progress.wikipedia.locatedTerms.length == terms_to_locate) {

                                /* REMOVE */
                                $('#wikipedia_loc_progress').toggleClass('loading done');
                                /* end of REMOVE */

                                progress.wikipedia.located = true;
                                clearInterval(checkWikipediaLocationProgress);
                            }
                        });
                        
                    }
                }, 500);

            var checkQueryProgress = setInterval(function () {
                if (progress.wikipedia.imaged && progress.wikipedia.defined) {
                    clearInterval(checkQueryProgress);
                
                    buildTable();
                    $('#files, #submit-parse').css({'display': 'none'});
                    $('#output').css({'display': 'inherit'});

                    
                }
            }, 500);
        }});
    }
    else {
        alert("No files select. Please select one or more files to parse.");
    }
}

function errorFn(error, file) {
    console.log("ERROR:", error, file);
}

function completeFn() { 
    parseResults(arguments[0]);
}

function parseResults(results) {
    for (i = 0; i < results.data.length; i++) {
        var term_array = results.data[i];
        term_obj = {'term': term_array[0],
                    'type': term_array[1].trim(),
                    'definition': null,
                    'thumbnail': null,
                    'images': [ ],
                    'location': null,
                    'status': null     
        }
        keyterms.push(term_obj);
    }
}

function getWikipediaDefinition(keyterms, id) {
    $.getJSON(
        "http://en.wikipedia.org/w/api.php?action=query&format=json&callback=?&explaintext=&redirects=", 
        { titles: keyterms[id].term,
          prop: "extracts",
          exsentences: 3,
          exsectionformat: "plain" },
        function(data) {
            page_ids = Object.keys(data.query.pages);

            // valid single term
            if (page_ids.length == 1 & page_ids[0] != -1) {
                page = data.query.pages[page_ids[0]];
                keyterms[id].definition = page.extract;
                keyterms[id].status = 'defined';
                progress.wikipedia.definedTerms.push(id);

            // invalid term
            } else if (page_ids[0] == -1) {
                console.log('Invalid Term: ', keyterms[id].term);
                keyterms[id].status = 'invalid';
                progress.wikipedia.invalidTerms.push(id);

            // ambigious term
            } else {
                console.log('Ambigious Term: ', keyterms[id].term);
                keyterms[id].status = 'ambigious';
                progress.wikipedia.ambiguousTerms.push(id);
            }
        });
}

function getWikipediaLocation(keyterms, id) {
    $.getJSON(
        "http://en.wikipedia.org/w/api.php?action=query&format=json&callback=?&redirects=",
        { titles: keyterms[id].term,
          prop: "coordinates",
        },
        function(data) {
            var page_id = Object.keys(data.query.pages)[0];
            var page    = data.query.pages[page_id];
            var coor    = page.coordinates[0];

            keyterms[id].location = {'lat': coor.lat, 'lng': coor.lon};
            progress.wikipedia.locatedTerms.push(id);
        });
}

function getWikipediaImages(keyterms, id) {
    var gotThumbnail = false;
    var gotOtherImgs = false;
    var title        = keyterms[id].term;

    $.getJSON(
        "http://en.wikipedia.org/w/api.php?action=query&format=json&callback=?&redirects=", 
        { titles: title,
          prop: "pageimages",
          piprop: "original" },
        function(data) {
            // assumption that the term is already valid
            var page_id = Object.keys(data.query.pages)[0];
            var page    = data.query.pages[page_id];
            var url     = page.thumbnail.original;

            keyterms[id].images.push(url);
            keyterms[id].thumbnail = url;
            gotThumbnail = true;
        });

    // get all other images
    $.getJSON(
        "http://en.wikipedia.org/w/api.php?action=query&format=json&callback=?&redirects=", 
        { titles: title,
          prop: "images" }, 
        function(data) { 
            // assumption that the term is already valid
            var page_id = Object.keys(data.query.pages)[0];
            var page    = data.query.pages[page_id];
            
            for (var j = 0; j < page.images.length; j++) {
                getWikipediaImageURL(keyterms, id, page.images[j].title);
            }

            var checkWikipediaIndividualImageProgress = setInterval(function() {
                if (keyterms[id].images.length == page.images.length + 1) {
                    gotOtherImgs = true;
                    clearInterval(checkWikipediaIndividualImageProgress);
                }
            }, 100);
        });

    var checkWikipediaAllImagesProgress = setInterval(function() {
        if (gotThumbnail & gotOtherImgs) {
            progress.wikipedia.imagedTerms.push(id);
            clearInterval(checkWikipediaAllImagesProgress);
        }
    });
}

function getWikipediaImageURL(keyterms, id, title) {
    $.getJSON("http://en.wikipedia.org/w/api.php?action=query&format=json&callback=?&redirects=", 
        { titles: title,
          prop: "imageinfo",
          iiprop: "url" }, 
        function(data) { 
            var page_id   = Object.keys(data.query.pages)[0];
            var page = data.query.pages[page_id];
            var url  = page.imageinfo[0].url;
            keyterms[id].images.push(url);
        });
}