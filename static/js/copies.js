var token = '[YOUR_TOKEN]';
var env = '[PROJECT MODE][production][development]';
var copiesLang = 'CopiesLangCookie';
var fetchLimits = 30;
var previewLimits = 1000;
var imageSizeLimits = 20000000;
var minDeviceWidth = 391;
var previewTimeout = 2500;
var refreshTimeout = 100000;
var uploadTimeout = 120000;
var panelConfirmTimeout = 15000;
var saveAndRefreshTimeout = 5000;
var maxLastCreated = 3600 * 24 * 90;
var isValid = false;
var isSignin = false;
var isFetching = false;
var isSearching = false;
var isUploading = false;
var isPaused = false;
var currentUsername = '';
var lastCreated = 0;
var invalidCreated = 0;
var lastKeyword = '';
var lastLeftScroll = 0;
var previewCopy;
var removeCopy;
var saveCopy;
var clickToRefresh;
var clickToAdd;
var clickToEndAdd;
var clickToSearch;
var clickToEndSearch;
var clickToShowStatus;
var clickToLoadMore;

var now = function() {
	var langCode = Cookies.get(copiesLang);
	if (langCode == 'kr') {
		langCode = 'ko';
	} else if (langCode == 'jp') {
		langCode = 'ja';
	}
	moment.locale(langCode);
    return moment().unix();
};

var keyboardShortcuts = function() {
    document.onkeydown = function(event) {
        if (!isValid || !isSignin || isFetching || isSearching || isUploading) { return }
            var x = event.which || event.keyCode;
        var t = event.target.tagName.toLowerCase();
        if (x != null && t == "body") {
            if (x == 82) {
                clickToRefresh();
            }
            if (x == 78) {
                clickToAdd();
            }
            if (x == 70) {
                clickToSearch();
            }
            return true;
        }
    }
};

var availability = function() {
    var width = (window.innerWidth > 0) ? window.innerWidth : screen.width;
    if (width < minDeviceWidth) {
        if (isSignin) {
            $('#copies-logo').fadeOut();
        } else {
            $('#copies-logo').fadeIn();
        }
    } else {
        $('#copies-logo').fadeIn();
    }
    delete width;
};

var exists = function(tagname) {
    if ($('#' + tagname).length != 0) {
        return true;
    }
    return false;
};

var contentOn = function(content) {
    var length = content.length;
    return length.toString() + ' <span lang="us" class="uk-text-muted">characters</span>';
};

var sizeOn = function(size) {
    return filesize(size, {base: 10});
};

var contentFilter = function(content) {
    content = $("<div>").text(content).html();
    var rex = /(https?:\/\/[^\s]+)/g;
    var filteredContent = content;
    try {
        filteredContent = content.replace(rex, function(url) {
            return '<a target="_blank" href="' + url + '">' + url + '</a>';
        });
    }
    catch(e) {}
    return [content, filteredContent];
};

var contentPreview = function(content) {
    var length = content.length;
    if (length > previewLimits) {
        return content.substring(0, previewLimits);
    }
    return content;
};

var dataURItoBlob = function(dataURI) {
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0) {
        byteString = atob(dataURI.split(',')[1]);
    } else {
        byteString = unescape(dataURI.split(',')[1]);
    }
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ia], {type:mimeString});
};

var imageErrorPlaceholder = function(s) {
    s.src = "/static/img/placeholder.png";
    s.onerror = "";
    return true;
}

var showLoadingPanel = function() {
    $('#copies-load-more').hide();
    $('#loading-wrapper').show();
};

var hideLoadingPanel = function() {
    $('#loading-wrapper').hide();
    $('#copies-load-more').hide();
    if (isValid) {
        try {
            if ($('#copies').find('tbody').css('display') != 'none') {
                $('#copies-load-more').show();
            }
        }
        catch(e) {}
    }
};

var showWelcome = function() {
    $('#copies-action').fadeOut();
    $('#welcome-wrapper').fadeIn();
    $('#copies-load-more').fadeOut();
};

var hideWelcome = function() {
    $('#welcome-wrapper').fadeOut();
    $('#copies-action').fadeIn();
    $('#copies').find('tbody').fadeIn();
};

var cleanupCopies = function() {
    $('#copies').find('tbody').fadeOut().empty();
};

var removeCopies = function() {
    $('#copies').find('tbody').fadeOut().empty().fadeIn();
}

var clipboard = null;

var appendCopies = function(copies) {
    var t = $('#copies').find('tbody');
    if (!t) { return }
    var pendingRows = [];
    var maxCreated = 0;
    for (var i = 0; i < copies.length; i++) {
        var c = copies[i]["fields"];
        if (!c) { continue }
        var md5 = c["md5"]["value"];
        var created = c["created"]["value"];
        var theContentFiltered = contentFilter(c["content"]["value"]);
        var content = theContentFiltered[1];
        var rawContent = theContentFiltered[0];
        var img = c["img"]["value"];
        var s_img_url = "";
        var r_img_url = "";
        var img_size = 0;
        if (!md5 || !created || !content || !img) { continue }
        if (exists(md5)) { continue }
        if (exists(created.toString())) { continue }
        var minLastCreated = parseInt(created);
        var pre = '<tr id="' + md5 + '">' + '<td id="' + created.toString() + '" class="uk-border-rounded">';
        var end = '</td></tr>';
        var contentLength = c["content"]["value"].length;
        var contentDate = moment(minLastCreated * 1000).fromNow();
        var contentCount = contentOn(rawContent);
        var part = '<article class="uk-comment">';
        part += '<header class="uk-comment-header">';
        if (img === "1") {
            r_img_url = c["r_img"]["value"]["downloadURL"].replace("${f}", content);
            if (!r_img_url) { continue }
            try {
                s_img_url = c["s_img"]["value"]["downloadURL"].replace("${f}", content);
            }
            catch(e) {
                s_img_url = r_img_url;
            }
            img_size = c["r_img"]["value"]["size"];
            if (s_img_url || r_img_url || img_size) {
                part += '<img class="uk-comment-avatar" src="';
                part += s_img_url;
                part += '" alt="';
                part += content;
                part += '" ';
                part += 'width="32"';
                part += ' onerror="imageErrorPlaceholder(this);"';
                part += ' />';
                contentCount = sizeOn(img_size);
            }
        }
        part += '<h4 class="uk-comment-title">';
        var modalMD5 = 'modal-' + md5;
        var textPreview = false;
        if (contentLength > previewLimits) {
            part += contentPreview(content);
            part += ' <a href="#' + modalMD5 + '" data-uk-modal="{center:true}">&nbsp;<i class="uk-icon-ellipsis-h"></i></a>';
            part += '<div id="' + modalMD5 + '" class="uk-modal">';
            part += '<div class="uk-modal-dialog">';
            part += '<a class="uk-modal-close uk-close"></a>';
            part += '<div class="uk-modal-header uk-text-muted">';
            part += contentDate;
            part += ', ';
            part += contentCount;
            part += '</div>';
            part += '<div class="uk-overflow-container">';
            part += content;
            part += '</div>';
            part += '</div>';
            part += '</div>';
            textPreview = '<a class="uk-button-link" href="#' + modalMD5 + '" data-uk-modal="{center:true}"><i class="uk-icon-newspaper-o"></i>&nbsp;<span lang="us"">Preview</span></a>';
        } else {
            part += '<span id="copies-action-';
            part += md5;
            part += '">';
            part += content;
            part += '</span>';
        }
        part += '</h4>';
        part += '<ul class="uk-comment-meta uk-subnav uk-subnav-line">';
        part += '<li>';
        part += contentDate;
        part += '</li>';
        part += '<li>';
        part += contentCount;
        part += '</li>';
        if (img === "1") {
            part += '<li>';
            part += '<a class="uk-button-link" onclick="previewCopy(\'';
            part += r_img_url;
            part += '\');"><i class="uk-icon-search-plus"></i>&nbsp;<span lang="us"">Preview</span></a>';
            part += '</li>';
        } else if (textPreview) {
            part += '<li>';
            part += textPreview;
            part += '</li>';
        } else {
            part += '<li>';
            part += '<a class="uk-button-link copies-action" data-clipboard-target="#copies-action-';
            part += md5;
            part += '"><i class="uk-icon-copy"></i>&nbsp;<span lang="us"">Copy</span>';
            part += '</a>';
            part += '</li>';
        }
        part += '<li>';
        part += '<a class="uk-button-link" onclick="removeCopy(\'';
        part += md5;
        part += '\');"><i class="uk-icon-remove"></i>&nbsp;<span lang="us"">Delete</span></a>';
        part += '</li>';
        part += '</ul>';
        part += '</header>';
        part += '</article>';
        pendingRows.push({
            date: minLastCreated,
            row: pre + part + end
        });
        delete pre, part, end, c, md5, created, content, rawContent, theContentFiltered, img, s_img_url, r_img_url, contentLength, contentCount, contentDate, modalMD5, textPreview;
    }
    $('#copies tr').each(function(i, row) {
        var td = $(row).find('td');
        var date = $(td).attr('id');
        date = parseInt(date);
        if (maxCreated == 0 || date >= maxCreated) {
            maxCreated = date;
        }
        delete td, date;
    });
    for (var k = 0; k < pendingRows.length; k += 1) {
        var aRow = pendingRows[k];
        if (aRow["date"] >= maxCreated) {
            $(aRow["row"]).hide().prependTo(t);
        } else {
            $(aRow["row"]).hide().appendTo(t);
        }
        delete aRow;
    }
    t.find('tr').sort(function(a, b) {
        var ka = parseInt($(a).find('td').attr('id'));
        var kb = parseInt($(b).find('td').attr('id'));
        return ka > kb ? -1 : ka < kb ? 1 : 0;
    }).appendTo(t).fadeIn();
    if (clipboard) { clipboard.destroy(); }
    clipboard = new Clipboard('.copies-action');
    clipboard.on('success', function(e) {
        e.clearSelection();
        UIkit.notify("<i class='uk-icon-check'></i>&nbsp;&nbsp;<span lang='us'>Content copied!</span>", {timeout: 1000, pos: "bottom-center"});
    });
    clipboard.on('error', function(e) {
    });
    delete t, pendingRows;
};

window.addEventListener('cloudkitloaded', function() {
    CloudKit.configure({
        locale: 'en-us',
        containers: [{
            containerIdentifier: 'iCloud.com.lkmake.copies',
            apiTokenAuth: {
                apiToken: token,
                persist: true,
                signInButton: {
                    id: 'apple-sign-in-button',
                    theme: 'black'
                },
                signOutButton: {
                    id: 'apple-sign-out-button',
                    theme: 'white_with_outline'
                }
            },
            environment: env
        }]
    });
    var container = CloudKit.getDefaultContainer();
    var database = container.privateCloudDatabase;

    function gotoAuthenticatedState(userInfo) {
        isSignin = true;
        hideWelcome();
        availability();
        fetchCopiesIfNeeded();
        try {
            currentUsername = userInfo['userRecordName'];
            clickToShowStatus(true);
        }
        catch(e) {
            currentUsername = '';
        }
        container.whenUserSignsOut().then(gotoUnauthenticatedState);
    }

    function gotoUnauthenticatedState(error) {
        isValid = false;
        isSignin = false;
        isFetching = false;
        availability();
        cleanupCopies();
        showWelcome();
        hideLoadingPanel();
        if (error && error.ckErrorCode === 'AUTH_PERSIST_ERROR') {
            alert(window.lang.translate("Unable to set a cookie, please check your browser settings for cookie and try again."));
        }
        container.whenUserSignsIn().then(gotoAuthenticatedState).catch(gotoUnauthenticatedState);
        $('#apple-sign-in-button').find('svg').css('width', '218px');
    }

    function fetchCopiesIfNeeded() {
        if (isFetching || isUploading || !isSignin) { return }
        isFetching = true;
        showLoadingPanel();
        var query = {
            recordType: 'Copy',
            sortBy: [{
                fieldName: 'created',
                ascending: 'False'
            }]
        };
        if (isSearching) {
            query.filterBy = [{
                comparator: 'CONTAINS_ANY_TOKENS',
                fieldName: 'content',
                fieldValue: {value: lastKeyword.toString()}
            }];
        } else {
            if (lastCreated == 0) {
                lastCreated = now();
            } else if (invalidCreated > 0 && lastCreated < invalidCreated) {
                lastCreated = invalidCreated;
            }
            query.filterBy = [{
                comparator: 'LESS_THAN_OR_EQUALS',
                fieldName: 'created',
                fieldValue: {value: lastCreated.toString()}
            }];
        }
        var options = {
            resultsLimit: fetchLimits,
            numbersAsStrings: true
        };
        database.performQuery(query, options).then(function(response) {
            if (!response.hasErrors) {
                try {
                    var records = response.records;
                    appendCopies(records);
                    for (var i = 0; i < records.length; i++) {
                        var created = parseInt(records[i].fields["created"]["value"]);
                        if (created < lastCreated) {
                            lastCreated = created;
                        }
                    }
                    delete records;
                }
                catch(e) {
                    console.log(e);
                }
            }
            hideLoadingPanel();
            isFetching = false;
            if (!isValid) {
                setTimeout(function() {
                    if (!isValid) {
                        invalidCreated = now() - maxLastCreated;
                    } else {
                        invalidCreated = 0;
                    }
                }, panelConfirmTimeout);
            }
        });
    }

    previewCopy = function(url) {
        var lightbox = UIkit.lightbox.create([{'source': url, 'type':'image'}]);
        lightbox.show();
    };

    removeCopy = function(md5) {
         if (!isValid) {
            clickToShowStatus(false);
            return
        }
        var t = $('#' + md5);
        if (!t) { return }
        UIkit.modal.confirm("<span lang='us'>Are you sure to delete?</span>", function() {
            var progressModal = UIkit.modal.blockUI("<span lang='us'>Deleting copy now, please wait...</span>");
            database.deleteRecords(md5, {}).then(function(response) {
                if (!response.hasErrors) {
                    t.fadeOut().remove();
                }
                progressModal.hide();
            });
            setTimeout(function() {
                progressModal.hide();
            }, panelConfirmTimeout);
        });
    };

    saveCopy = function(r) {
        isUploading = true;
        var statusModal = UIkit.modal.blockUI("<span lang='us'>Saving copy now, please wait...</span>");
        var options = { numbersAsStrings: true };
        setTimeout(function() {
            statusModal.hide();
            isUploading = false;
        }, uploadTimeout);
        database.saveRecords(r, options).then(function(response) {
            isUploading = false;
            statusModal.hide();
            if (!response.hasErrors) {
                setTimeout(function() {
                    clickToRefresh();
                }, saveAndRefreshTimeout);
            }
        });
    };

    clickToRefresh = function() {
        if (isValid) {
            lastCreated = 0;
            fetchCopiesIfNeeded();
        } else {
            clickToShowStatus(false);
        }
    }

    clickToAdd = function() {
        if (isUploading) { return }
        if (isValid) {
            var addModal = UIkit.modal('#add-wrapper');
            addModal.show();
        } else {
            clickToShowStatus(false);
        }
    };

    clickToEndAdd = function() {
        UIkit.modal('#add-wrapper').hide();
        try {
            var record;
            var text = $('#add-text').val();
            var textString = text.toString();
            if (textString.length > 0) {
                var md5 = SparkMD5.hash(text);
                record = {
                    recordName: md5.toString(),
                    recordType: "Copy",
                    fields: {
                        md5: {
                            value: md5.toString()
                        },
                        content: {
                            value: text.toString()
                        },
                        created: {
                            value: now().toString()
                        },
                        img: {
                            value: '2'
                        }
                    }
                };
                saveCopy(record);
            } else {
                throw 'Empty input, ignore.';
            }
            delete record, text, textString;
        }
        catch(e) {}
        $('#add-text').val('');
    };

    clickToSearch = function() {
        if (isValid) {
            var prompt = UIkit.modal.prompt("<span lang='us'>Enter keyword to search:</span>", "", function(keyword) {
                if (keyword != "") {
                    isSearching = true;
                    lastKeyword = keyword;
                    removeCopies();
                    $('#search-keyword').html(keyword);
                    $('#search-wrapper').fadeIn();
                    fetchCopiesIfNeeded();
                }
            });
            setTimeout(function() {
                prompt.hide();
            }, panelConfirmTimeout);
        } else {
            clickToShowStatus(false);
        }
    };

    clickToEndSearch = function() {
        isSearching = false;
        lastCreated = 0;
        lastKeyword = '';
        $('#search-keyword').html('');
        $('#search-wrapper').fadeOut();
        removeCopies();
        fetchCopiesIfNeeded();
    };

    clickToShowStatus = function(isSilent) {
        if (currentUsername == "") { return }
        var statusModal;
        if (!isSilent) {
            statusModal = UIkit.modal.blockUI("<span lang='us'>Loading status info now, please wait...</span>");
        }
        var query = {
            recordType: 'Sync',
            sortBy: [{
                fieldName: 'created',
                ascending: 'False'
            }]
        };
        query.filterBy = [{
            comparator: 'EQUALS',
            fieldName: 'account',
            fieldValue: {value: currentUsername}
        }]
        var options = {
            numbersAsStrings: true
        };
        var statusInfo = "<span lang='us'>Sync service status unknown, please try again later.</span>";
        isValid = false;
        function clickToShowStatusAlertStatus(info) {
            hideLoadingPanel();
            cleanupCopies();
            showWelcome();
            if (isPaused) {
                var infoModal = UIkit.modal.alert("<span lang='us'>Sync service is paused.<span>");
                setTimeout(function() {
                    infoModal.hide();
                }, panelConfirmTimeout);
            }
            if (isSilent) { return }
            statusModal.hide();
            var infoModal = UIkit.modal.alert(info);
            setTimeout(function() {
                infoModal.hide();
            }, panelConfirmTimeout);
        }
        try {
            database.performQuery(query, options).then(function(response) {
                if (!response.hasErrors) {
                    var syncs = response.records;
                    if (syncs.length > 0) {
                        var syncStatus = syncs[0].fields["status"]["value"];
                        if (syncStatus == "1") {
                            isValid = true;
                            isPaused = false;
                            statusInfo = "<span lang='us'>Sync service is active.</span>";
                            hideLoadingPanel();
                            if (isSilent) { return }
                            statusModal.hide();
                            var infoModal = UIkit.modal.alert(statusInfo);
                            setTimeout(function() {
                                infoModal.hide();
                            }, panelConfirmTimeout);
                        } else {
                            statusInfo = "<span lang='us'>Sync service is paused.</span>";
                            isPaused = true;
                            clickToShowStatusAlertStatus(statusInfo);
                        }
                    } else {
                        statusInfo = "<span lang='us'>Sync service is inactive, please enable cloud sync on your Mac.</span>";
                        clickToShowStatusAlertStatus(statusInfo);
                    }
                    delete syncs;
                } else {
                    clickToShowStatusAlertStatus(statusInfo);
                }
            });
        }
        catch(e) {
            clickToShowStatusAlertStatus(statusInfo);
        }
    };

    clickToLoadMore = function() {
        fetchCopiesIfNeeded();
    };

    return container.setUpAuth().then(function(userInfo) {
            if (userInfo) {
                gotoAuthenticatedState(userInfo);
            } else {
                gotoUnauthenticatedState();
            }
        });
});

$(window).on("orientationchange", function() {
    availability();
});

$(window).scroll(function() {
    if (!isSearching) { return }
    var search = $('#search-wrapper');
    if ($(window).scrollTop() > 80) {
        search.addClass('search-fixed');
    } else {
        search.removeClass('search-fixed');
    }
});

$(document).ready(function() {
    $('#copies-load-more').hide();
    $('#copies-action').hide();
    $('#search-wrapper').hide();
    var thumbnail = $('#add-image-thumbnail');
    $("#add-image").change(function(event) {
        setTimeout(function() {
            UIkit.modal('#add-wrapper').hide();
        }, previewTimeout);
        try {
            var r_image = event.target.files[0];
            if (!r_image) {
                throw "No image, ignore.";
            } else {
                var reader = new FileReader();
                var s_reader = new FileReader();
                reader.readAsBinaryString(r_image);
                s_reader.readAsDataURL(r_image);
                reader.onloadend = function(e) {
                    var file = e.target.result;
                    var md5 = SparkMD5.hashBinary(file);
                    var filename = r_image.name;
                    if (r_image.size > imageSizeLimits) {
                        throw "Image too large, ignore.";
                    } else {
                        s_reader.onload = function(se) {
                            var canvas = document.createElement('canvas');
                            var img = new Image();
                            img.src = se.target.result;
                            img.onload = function() {
                                canvas.id = "privateCanvas";
                                canvas.width = Number(64);
                                canvas.height = Number(64);
                                if (canvas.getContext) {
                                    var cntxt = canvas.getContext('2d');
                                    cntxt.drawImage(img, 0, 0, canvas.width, canvas.height);
                                    var dataURL = canvas.toDataURL('image/png', 0.8);
                                    if (dataURL != null && dataURL != undefined) {
                                        thumbnail.attr("src", dataURL);
                                        thumbnail.fadeIn();
                                        var s_image = null;
                                        try {
                                            s_image = dataURItoBlob(dataURL);
                                        }
                                        catch(e) {}
                                        saveCopy({
                                            recordName: md5,
                                            recordType: "Copy",
                                            fields: {
                                                md5: {
                                                    value: md5
                                                },
                                                content: {
                                                    value: filename
                                                },
                                                created: {
                                                    value: now().toString()
                                                },
                                                img: {
                                                    value: '1'
                                                },
                                                r_img: {
                                                    value: r_image
                                                },
                                                s_img: {
                                                    value: s_image
                                                }
                                            }
                                        });
                                        delete s_image, r_image, canvas, img, dataURL, cntxt, filename, md5, file, s_reader, reader;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        catch(e) {
            isUploading = false;
        }
        $('#add-image').val('');
        thumbnail.val('');
        thumbnail.hide();
    });
    thumbnail.hide();
    availability();
    keyboardShortcuts();
    setInterval(function() {
        if (!isValid || !isSignin || isFetching || isSearching || isUploading) { return }
        clickToRefresh();
    }, refreshTimeout);
});
