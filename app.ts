'use strict';

let serves : number = 2;        // default to pickleball

function round(a: number) : number { return (a + 0.5) | 0; };
function roundBy(a: number, b: number) : number { return ((a + b - 1)/ b | 0) * b; }
function max(a: number, b: number) : number { return a > b ? a : b; }
function min(a: number, b: number) : number { return a < b ? a : b; }
function pad2(s: number) : string {return s < 10 ? '0' + s : s.toString();}
function pad3(s: number) : string {return s < 100 ? '0' + pad2(s) : s.toString();}
function secondsToTime(s: number) {
    let hh : number = s / 3600 | 0;
    let mmss : string = pad2((s % 3600 / 60) | 0) + ':' + pad2((s % 60) | 0) + '.' + pad3(round((s % 1)*1000));
    return (hh > 0) ? pad2(hh) + mmss : mmss;
}
function padLeft(s: string, n : number) : string {
    let length : number = s.length;
    while (length < n) {
        s = ' ' + s;
        length = length + 1;
    }
    return s;
}

function padRight(s: string, n : number) : string {
    let length : number = s.length;
    while (length < n) {
        s = s + ' ';
        length = length + 1;
    }
    return s;
}

function generateID() : string {
    return Math.random().toString(36).substring(2, 15);
}

const bullet : string = '●';
const triangle : string = '►';

const defaultScore : string = bullet+bullet+' 00\n   00';

function analyzeScore(s: string) : void {
    const scores : string [] = s.split('\n', 2);
    if (scores.length == 2) {
        const k1 = countSymbols(scores[0]);
        const k2 = countSymbols(scores[1]);
        if (max(k1, k2) == 1)
            serves = 1;
    }
}

function getOptionText(sel: string,align: string,size: number,top: number,left: number,bot: number,right: number) : string {
    if (sel=='TL')
        return ' align:'+align+' size:'+size+'% position:'+left+'% line:'+top+'%';
    if (sel=='TR')
        return ' align:'+align+' size:'+size+'% position:'+right+'% line:'+top+'%';
    if (sel=='BL')
        return ' align:'+align+' size:'+size+'% position:'+left+'% line:'+bot+'%';
    if (sel=='BR')
        return ' align:'+align+' size:'+size+'% position:'+right+'% line:'+bot+'%';
    return '';
}

/// test for bullet or triangle character
function isSymbol(ch: string) : boolean
{    
    return ((ch == bullet) || (ch== triangle))
}

/// count leading symbols in string
function countSymbols(s: string) : number
{
    let count : number = 0;
    let i : number = 0;
    while (s.length > i && isSymbol(s[i])) {
        count = count + 1;
        i = i + 1;
    }
    return count;
}

window.addEventListener('load', function() {
    const on = EventTarget.prototype.addEventListener;
    let _dropTarget = document.documentElement;
    let _body = document.body;
    let _cueList = [];
    let _cueRows = new WeakMap();
    let _track : TextTrack = null;
    let $ = document.querySelector.bind(document);
    const _video = $('#video') as unknown as HTMLVideoElement;
    const _timer = $('#timer') as unknown as HTMLTextAreaElement;
    const _progress = $('#progress') as unknown as HTMLProgressElement;
    const _cues = $('#cues') as unknown as HTMLTableRowElement;
    const _playPause = $('#playPause') as unknown as HTMLButtonElement;
    const _addCueButton = $('#addCue') as unknown as HTMLButtonElement;
    const _sortCuesButton = $('#sortCues') as unknown as HTMLButtonElement;
    const _exportVTTButton = $('#exportVTT') as unknown as HTMLButtonElement;
    const _posSelect = $('#pos') as unknown as HTMLSelectElement;
    const _minusButton = $('#minus') as unknown as HTMLButtonElement;
    const _sideButton = $('#side') as unknown as HTMLButtonElement;
    const _plusButton = $('#plus') as unknown as HTMLButtonElement;
    const _previewButton = $('#previewButton') as unknown as HTMLButtonElement;
    const _importVideoButton = $('#importVideo') as unknown as HTMLButtonElement;
    const _importVideoFile = $('#importVideoFile') as unknown as HTMLInputElement;
    let _importVTTButton = $('#importVTT') as unknown as HTMLButtonElement;
    let _importVTTFile = $('#importVTTFile') as unknown as HTMLInputElement;
    let _vttFilename = '';
    function skipTime(seconds) {
        _video.currentTime += seconds;
    }
    function togglePlayPause() {
        if (_video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        if (_video.paused) {
            _video.play();
            _playPause.classList.remove('paused');
        } else {
            _video.pause();
            _playPause.classList.add('paused');
        }
    }
    function initVideo() {
        _video.addEventListener('click', function() {
            togglePlayPause();
        });
        _video.addEventListener('timeupdate', function() {
            _timer.textContent = secondsToTime(_video.currentTime);
            if (isFinite(_video.duration)) {
                _progress.value = Math.round((_video.currentTime / _video.duration) * 100);
            } else {
                _progress.value = 0;
            }
        });
    }
    function formatTableRow(start: number | null, end: number | null, text: string) : string {
        const jumpStr : string = '<td><button type="button" class="jumpCue" title="Jump to cue">&#8677;</button></td>';
        const startTime : string = '<td><span class="timestamp">' + (start === null ? '<button type="button" class="insertTime start" title="Set current time">Set time</button></span>' : secondsToTime(start) + '</span> <button type="button" class="insertTime update start" title="Set current time">&#128336;</button>') + '</td>';
        const endTime : string = '<td><span class="timestamp">' + (end === null ? '<button type="button" class="insertTime end" title="Set current time">Set time</button></span>' : secondsToTime(end) + '</span> <button type="button" class="insertTime update end" title="Set current time">&#128336;</button>') + '</td>';
        const textStr : string = '<td class="textinput"><textarea>' + text + '</textarea><button type="button" class="apply-text" title="Apply text">&#10003;</button></td>';
        const delStr : string = '<td><button type="button" class="delete-cue" title="Delete cue">&times;</button></td>';
        return jumpStr + startTime + endTime + textStr + delStr;
    }
    function updateLastCue(start: number | null, end: number | null, text: string) {
        const id : number = _cueList.length;
        if (id > 0) {
            let prev =_cueList[id-1];
            prev.start = start;
            prev.end = end;
            prev.text = text;
            const rowStr = '<tr><td class="id">' + id + '</td>' + formatTableRow(start, end, text) + '</tr>';
            const tr : HTMLTableRowElement = _cues.querySelector('tr:last-child');
            tr.setHTMLUnsafe(rowStr);
        }
    }
    function addCueAtEnd(start: number | null, end: number | null, text: string) {
        let id : number = _cueList.length;
        if (id == 1)
            analyzeScore(text);
        if (id > 1) {
            let prev =_cueList[id-1];
            if (prev.start == start) {
                // update instead of adding row
                updateLastCue(start, end, text);
                return;
            }
        }
        const rowStr : string = formatTableRow(start, end, text);
        _cues.insertAdjacentHTML('beforeend', '<tr class="incomplete"><td class="id">' + (id + 1) + rowStr + '</tr>');
        let row = _cues.querySelector('tr:last-child');
        let entry = {'start': start, 'end': end, 'text': text, 'row' :row };
        _cueList.push(entry);
        _cueRows.set(row, entry);
    }
    function handleScore(delta: number) : void {
        _video.pause();
        let end : number = _cueList.length;
        if (end > 0) {
            let prev = _cueList[end - 1];
            let str: string = prev.text;
            let scores: string [] = str.split('\n', 2);
            if (scores.length > 1) {
                let s1 : string = scores[0];
                let k1 : number = countSymbols(s1);
                let v1 : number = parseInt(s1.substring(k1));
                let s2 : string = scores[1];
                let k2 : number = countSymbols(s2);
                let v2 : number = parseInt(s2.substring(k2));
                if (delta != 0) {
                    // increase or decrease score
                    if (k1 > 0) {
                        s1 = s1.substring(0, k1 + 1) + pad2(max(v1 + delta, 0));
                    } else if (k2 > 0) {
                        s2 = s2.substring(0, k2 + 1) + pad2(max(v2 + delta, 0));
                    }
                } else {
                    // handle side out
                    if (k1 > 0) {
                        // sideout team #1
                        if (k1 == 1 && serves==2) {
                            s1 = s1[0] + s1;
                        } else {
                            s2 = s1[0] + ' ' + s2.trim();
                            s1 = s1.substring(k1 + 1);
                        }

                    } else if (k2 > 0) {
                        // sideout team #2
                        if (k2 == 1 && serves==2) {
                            s2 = s2[0] + s2;
                        } else {
                            s1 = s2[0] + ' ' + s1.trim();
                            s2 = s2.substring(k2 + 1);
                        }
                    }
                }
                // Add new cue at end of cueList
                const l1 = s1.length;
                const l2 = s2.length;
                const text = padLeft(s1, l2) + '\n' + padLeft(s2, l1);
                addCueAtEnd(_video.currentTime, null, text);
            } else {
                // handle single line score
                scores = str.split('-', 3);
                const parts : number = scores.length;
                if (parts > 1) {
                    let s1 : string = scores[0];
                    let v1 : number = parseInt(s1);
                    let s2 : string = scores[1];
                    let v2 : number = parseInt(s2);
                    let server : number = 1;
                    if (parts == 3) {
                        serves = 2;
                        server = parseInt(scores[2]);
                    } else {
                        serves = 1;
                    }
                    if (delta != 0) {
                        // increase or decrease server's score
                        s1 = (v1 + delta).toString();
                    } else {
                        if (server < serves) {
                            // increase server #
                            server = server + 1;
                        } else {
                            // sideout swap server, receiver scores
                            let temp = s1;
                            s1 = s2;
                            s2 = temp;
                            server = 1;
                        }
                    }
                    let text : string = s1 + '-' + s2;
                    if (parts > 1) {
                        text += '-' + server;
                    }
                    addCueAtEnd(_video.currentTime, null, text);
                }
            }
        } else {
            let sel : string = _posSelect.value;
            let text : string = (sel != 'None') ? defaultScore : "0-0-2";
            addCueAtEnd(_video.currentTime, null, text);
        }

    }
    _playPause.addEventListener('click', function() {
        togglePlayPause();
    });
    initVideo();
    function insertNewVTTCue(cue) {
        let vtt_cue = new VTTCue(cue.start, cue.end, cue.text);
        vtt_cue.id = generateID();
        _track.addCue(vtt_cue);
        cue.cue_id = vtt_cue.id;
    }
    function getCueEntryByCueID(cue_id: string) {
        return _cueList.find(function(cue) {
            return cue.cue_id === cue_id;
        });
    }
    function writeCueList(cues) {
        _cueList = cues;
        _track = _video.addTextTrack('subtitles', 'English', 'en');
        let list = '';
        cues.forEach(function(cue, i) {
            if (cue.start !== null && cue.end !== null) {
                insertNewVTTCue(cue);
            }
            if (i == 1)
                analyzeScore(cue.text);
            let rowStr : string = formatTableRow(cue.start, cue.end, cue.text);
            list += '<tr><td class="id">' + (i + 1) + '</td>' + rowStr + '</tr>';
        });
        _cues.innerHTML = list;
        _cues.querySelectorAll('tr').forEach(function(row, i) {
            let cue = _cueList[i];
            _cueRows.set(row, cue);
            cue.row = row;
        });
        _track.mode = 'showing';
        _track.addEventListener('cuechange', function() {
            _cues.querySelectorAll('tr.active').forEach(function(row) {
                row.classList.remove('active');
            });
            if (_track.activeCues.length === 0) return;
            Array.from(_track.activeCues).forEach(function(entry: { 'id': string }) {
                let activeID = entry.id;
                let cue = getCueEntryByCueID(activeID);
                cue.row.classList.add('active');
            });
        });
    }
    _addCueButton.addEventListener('click', function() {
        let sel : string = _posSelect.value;
        let index : number = _cueList.length;
        let text : string = (sel == 'None') ? '' : (index == 0) ? 'Team 1\nTeam 2' : defaultScore;
        addCueAtEnd(_video.currentTime, null, text);
    });
    _exportVTTButton.addEventListener('click', function() {
        let content : string = buildContent();
        let blob : Blob = new Blob([content], {'type': 'text/vtt'});
        let url = URL.createObjectURL(blob);
        let link = document.createElement('a');
        link.download = _vttFilename || 'subtitles.vtt';
        link.href = url;
        link.click();
    });
    _minusButton.addEventListener('click', function() {
        handleScore(-1);
    });
    _sideButton.addEventListener('click', function() {
        handleScore(0);
    });
    _plusButton.addEventListener('click', function() {
        handleScore(+1);
    });

    _progress.addEventListener('click', function(event) {
        let x = event.pageX - this.offsetLeft;
        let y = event.pageY - this.offsetTop;
        let clickedValue = x * this.max / this.offsetWidth;
        if (_video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) return;
        if (isFinite(_video.duration)) {
            _video.currentTime = _video.duration / 100 * clickedValue;
        }
    });
    _previewButton.addEventListener('click', function() {
        document.body.classList.toggle('preview');
    });
    function compCues(a: { start: number; }, b: { start: number; }) {        
        if (a.start === null) {
            return 1;
        }
        if (b.start === null) {
            return -1;
        }
        let startDiff : number = a.start - b.start;
        return startDiff;
    }
    function buildContent() : string
    {
        _cueList.sort(compCues);

        let count : number = _cueList.length;
        // Fill in missing end times with next start time or video duration
        _cueList.forEach(function(cue, index: number) {
            if (cue.end == null) {
                let time : number = (index + 1 < count) ? _cueList[index + 1].start : _video.duration;
                if (time == 0 ) 
                    time = _video.duration;
                cue.end = time;
            }
        });

        let content : string = 'WEBVTT' +'\nLanguage: en\n';
        let width : number = 30;
        _cueList.forEach(function(cue,index: number) {
            let posOption : string = _posSelect.value;
            let text : string = cue.text;
            const lines : string [] = text.split('\n', 2);
            let size : number = 20;
            if (lines.length == 2) {
                if (index == 0) {
                    lines[0] = lines[0].trim();
                    lines[1] = lines[1].trim();
                    width = roundBy(max(lines[0].length,lines[1].length), 5) + 15;
                    lines[0] = padRight(lines[0], width);
                    lines[1] = padRight(lines[1], width);
                } else {
                    size = max(lines[0].length,lines[1].length);
                    lines[0] = padLeft(lines[0], size);
                    lines[1] = padLeft(lines[1], size);
                    size = roundBy(size * 2, 5);
                }
                text = lines[0] + '\n' + lines[1];
            } else {
                size = text.length;
            }
            content += '\n\n' + secondsToTime(cue.start) + ' --> ' + secondsToTime(cue.end);
            content += (index == 0) && (posOption != 'None')
                        ? getOptionText(posOption,'start',width,10,0,90,100 - width - 5)
                        : getOptionText(posOption,'end',size,10,width,90,100);
            content += '\n' + text;
        });
        return content;
    }

    _sortCuesButton.addEventListener('click', function() {
        _cueList.sort(compCues);
        _cueList.forEach(function(cue, i: number) {
            _cues.appendChild(cue.row);
            cue.row.querySelector('td.id').textContent = (i + 1);
        });
    });
    function updateRowNumbers() {
        _cues.querySelectorAll('tr').forEach(function(row, i: number) {
            row.querySelector('td.id').textContent = (i + 1).toString();
        });
    }
    document.addEventListener('click', function(event: Event) {
        let id, cue, cue2, row, time, timestamp, temp, was_incomplete, is_incomplete;
        const element = event.target as Element;
        let remove = element.closest('.delete-cue');
        let jump = element.closest('.jumpCue');
        let setTime = element.closest('.insertTime');
        let button = element.closest('button');
        if (button) {
            button.blur();
        }
        if (jump) {
            row = jump.closest('tr');
            cue = _cueRows.get(row);
            if (cue.start !== null) {
                _video.currentTime = cue.start;
            }
            return;
        }
        if (remove) {
            row = remove.closest('tr');
            cue = _cueRows.get(row);
            id = _cueList.indexOf(cue);
            cue.row = null;
            _cueRows.delete(row);
            _cueList.splice(id, 1);
            if (cue.cue_id !== undefined) {
                _track.removeCue(_track.cues.getCueById(cue.cue_id));
                reinitCues();
            }
            _cues.removeChild(row);
            updateRowNumbers();
            return;
        }
        if (setTime) {
            row = element.closest('tr');
            cue = _cueRows.get(row);
            time = _video.currentTime;
            was_incomplete = (cue.start === null || cue.end === null);
            timestamp = element.closest('td').querySelector('span.timestamp');
            if (element.classList.contains('start')) {
                if (cue.end !== null && time > cue.end) {
                    alert('start time cannot be after end time.');
                    return;
                }
                if (cue.start === null) {
                    timestamp.insertAdjacentHTML('afterend', ' <button type="button" class="insertTime update start" title="Set current time">&#128336;</button>');
                }
                cue.start = time;
                if (cue.cue_id !== undefined) {
                    _track.cues.getCueById(cue.cue_id).startTime = time;
                    reinitCues();
                }
            }
            else if (element.classList.contains('end')) {
                if (cue.start !== null && time < cue.start) {
                    alert('end time cannot be before start time.');
                    return;
                }
                if (cue.end === null) {
                    timestamp.insertAdjacentHTML('afterend', ' <button type="button" class="insertTime update end" title="Set current time">&#128336;</button>');
                }
                cue.end = time;
                if (cue.cue_id !== undefined) {
                    _track.cues.getCueById(cue.cue_id).endTime = time;
                    reinitCues();
                }
            }
            is_incomplete = (cue.start === null || cue.end === null);
            timestamp.textContent = secondsToTime(time);
            if (was_incomplete && !is_incomplete) {
                insertNewVTTCue(cue);
            }
            return;
        }
    });
    document.addEventListener('keyup', function(event: KeyboardEvent) {
        const element = event.target as Element;
        if (element.nodeName === 'TEXTAREA' && !_video.paused) {
            _video.pause();
        }
    });
    document.addEventListener('keydown', function(event: KeyboardEvent) {
        const code = event.code;
        const element = event.target as Element;
        const node = element.nodeName;
        if (node === 'TEXTAREA' || node === 'BUTTON') return;
        if (code === 'ArrowRight') {
            event.altKey ? skipTime(0.5) : skipTime(2);
        }
        else if (code === 'ArrowLeft') {
            event.altKey ? skipTime(-0.5) : skipTime(-2);
        }
        else if (code === 'Space') {
            togglePlayPause();
        }
        else if ((code === 'Escape' || code === 'Esc') && document.body.classList.contains('preview')) {
            document.body.classList.toggle('preview');
        }
    });
    document.addEventListener('change', function(event) {
        let content, row, cue;
        const element = event.target as Element;
        if (element.nodeName === 'TEXTAREA') {
            const cell = element as HTMLTextAreaElement;
            content = cell.value;
            row = element.closest('tr');
            cue = _cueRows.get(row);
            cue.text = content;
            if (cue.row == 1) {
                analyzeScore(content);
            }
            if (cue.cue_id !== undefined) {
                const vttcue = _track.cues.getCueById(cue.cue_id) as VTTCue;
                vttcue.text = content;
                reinitCues();
            }
            element.closest('td').classList.remove('changed');
        }
    });
    document.addEventListener('input', function(event: Event) {
        let row, cue;
        const element = event.target as Element;
        if (element.nodeName !== 'TEXTAREA')
            return;
        const cell = element as HTMLTextAreaElement;
        row = element.closest('tr');
        cue = _cueRows.get(row);
        element.parentElement.classList.toggle('changed', cue.text !== cell.value);
    });
    _importVideoButton.addEventListener('click', () => {
        _importVideoFile.click();
    });
    _importVideoFile.addEventListener('change', function(event: InputEvent) {
        let file, url;
        const input = event.target as undefined as DataTransfer;
        let files = input.files;
        try {
            if (files.length < 1) throw new Error('no file');
            file = files[0];
            if (file.size === 0) throw new Error('file empty');
            if (file.type.indexOf('video/') !== 0) throw new Error('invalid file format');
            if (_vttFilename === '') {
                _vttFilename = file.name.substring(0, file.name.lastIndexOf('.'));
            }
            url = URL.createObjectURL(file);
            _video.pause();
            _video.currentTime = 0;
            _video.src = url;
            if (_cueList.length === 0) {
                writeCueList([]);
            }
        } catch(e) {
            alert(e.message);
        } finally {
            resetFileInput(input);
        }
    });
    _importVTTButton.addEventListener('click', function() {
        _importVTTFile.click();
    });
    _importVTTFile.addEventListener('change', function(event: Event) : void {
        let file, video, url, track;
        const input = event.target as undefined as DataTransfer;
        let files = input.files;
        try {
            if (files.length < 1) throw new Error('no file');
            file = files[0];
            if (file.size === 0) throw new Error('file empty');
            if (_cueList.length > 0 && confirm('Load VTT will clenaup the current cues.\nContinue?') !== true) {
                return;
            }
            video = document.createElement('video');
            url = URL.createObjectURL(file);
            const track = document.createElement('track') as HTMLTrackElement;
            track.kind = 'subtitles';
            track.label = 'English';
            track.srclang = 'en';
            track.addEventListener('error', function() {
                alert('Invalid VTT file.');
            });
            track.addEventListener('load', function() {
                let list;
                serves = 2;     // restore default (pickleball)
                _cueList.forEach(function(cue) {
                    _cueRows.delete(cue.row);
                    cue.row = null;
                });
                if (_track) {
                    _track.mode = 'disabled';
                    _track = null;
                }
                _vttFilename = file.name;
                list = Array.from(this.track.cues).map(function(cue: VTTCue) {
                    return { 'start': cue.startTime, 'end': cue.endTime, 'text': cue.text };
                });
                writeCueList(list);
            });
            track.src = url;
            video.appendChild(track);
            track.track.mode = 'showing';
        } catch(e) {
            alert(e.message);
        } finally {
            resetFileInput(input);
        }
    });
    function resetFileInput(input) {
        input.value = '';
    }
    function reinitCues() {
        _track.mode = 'hidden';
        _track.mode = 'showing';
    }
    _dropTarget.addEventListener('drop', onDrop);
    _dropTarget.addEventListener('dragover', onDragOver);
    _dropTarget.addEventListener('dragleave', onDragEnd);
    _dropTarget.addEventListener('dragend', onDragEnd);

    function onDragOver(event) {
        event.preventDefault();
        _body.classList.add('drop-target');
    }
    function onDragEnd() {
        _body.classList.remove('drop-target');
    }
    function onDrop(event: InputEvent) {
        event.preventDefault();
        onDragEnd();
        let input : HTMLInputElement;
        let files = event.dataTransfer.files;
        if (files.length === 0) {
            return;
        }
        if (files.length > 1) {
            alert('Multiple files are not supported.');
            return;
        }
        let file = files[0];
        if (file.type.indexOf('text/') === 0) {
            input = _importVTTFile;
        } else if (file.type.indexOf('video/') === 0) {
            input = _importVideoFile;
        } else {
            return;
        }
        input.files = files;
        let myevent = new Event('change');
        input.dispatchEvent(myevent);
    }
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', {'scope': '/webvtt-editor/'});
    }
});
