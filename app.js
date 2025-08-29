'use strict';
let serves = 2; // default to pickleball
function round(a) { return (a + 0.5) | 0; }
;
function roundBy(a, b) { return ((a + b - 1) / b | 0) * b; }
function max(a, b) { return a > b ? a : b; }
function min(a, b) { return a < b ? a : b; }
function pad2(s) { return s < 10 ? '0' + s : s.toString(); }
function pad3(s) { return s < 100 ? '0' + pad2(s) : s.toString(); }
function secondsToTime(s) {
    let hh = s / 3600 | 0;
    let mmss = pad2((s % 3600 / 60) | 0) + ':' + pad2((s % 60) | 0) + '.' + pad3(round((s % 1) * 1000));
    return (hh > 0) ? pad2(hh) + mmss : mmss;
}
function padLeft(s, n) {
    let length = s.length;
    while (length < n) {
        s = ' ' + s;
        length = length + 1;
    }
    return s;
}
function padRight(s, n) {
    let length = s.length;
    while (length < n) {
        s = s + ' ';
        length = length + 1;
    }
    return s;
}
function generateID() {
    return Math.random().toString(36).substring(2, 15);
}
const bullet = '●';
const triangle = '►';
const defaultScore = bullet + bullet + ' 00\n   00';
function analyzeScore(s) {
    const scores = s.split('\n', 2);
    if (scores.length == 2) {
        const k1 = countSymbols(scores[0]);
        const k2 = countSymbols(scores[1]);
        if (max(k1, k2) == 1)
            serves = 1;
    }
}
function getOptionText(sel, align, size, top, left, bot, right) {
    if (sel == 'TL')
        return ' align:' + align + ' size:' + size + '% position:' + left + '% line:' + top + '%';
    if (sel == 'TR')
        return ' align:' + align + ' size:' + size + '% position:' + right + '% line:' + top + '%';
    if (sel == 'BL')
        return ' align:' + align + ' size:' + size + '% position:' + left + '% line:' + bot + '%';
    if (sel == 'BR')
        return ' align:' + align + ' size:' + size + '% position:' + right + '% line:' + bot + '%';
    return '';
}
/// test for bullet or triangle character
function isSymbol(ch) {
    return ((ch == bullet) || (ch == triangle));
}
/// count leading symbols in string
function countSymbols(s) {
    let count = 0;
    let i = 0;
    while (s.length > i && isSymbol(s[i])) {
        count = count + 1;
        i = i + 1;
    }
    return count;
}
window.addEventListener('load', function () {
    const on = EventTarget.prototype.addEventListener;
    let _dropTarget = document.documentElement;
    let _body = document.body;
    let _cueList = [];
    let _cueRows = new WeakMap();
    let _track = null;
    let $ = document.querySelector.bind(document);
    const _video = $('#video');
    const _timer = $('#timer');
    const _progress = $('#progress');
    const _cues = $('#cues');
    const _playPause = $('#playPause');
    const _addCueButton = $('#addCue');
    const _sortCuesButton = $('#sortCues');
    const _exportVTTButton = $('#exportVTT');
    const _posSelect = $('#pos');
    const _minusButton = $('#minus');
    const _sideButton = $('#side');
    const _plusButton = $('#plus');
    const _previewButton = $('#previewButton');
    const _importVideoButton = $('#importVideo');
    const _importVideoFile = $('#importVideoFile');
    let _importVTTButton = $('#importVTT');
    let _importVTTFile = $('#importVTTFile');
    let _vttFilename = '';
    function skipTime(seconds) {
        _video.currentTime += seconds;
    }
    function togglePlayPause() {
        if (_video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)
            return;
        if (_video.paused) {
            _video.play();
            _playPause.classList.remove('paused');
        }
        else {
            _video.pause();
            _playPause.classList.add('paused');
        }
    }
    function initVideo() {
        _video.addEventListener('click', function () {
            togglePlayPause();
        });
        _video.addEventListener('timeupdate', function () {
            _timer.textContent = secondsToTime(_video.currentTime);
            if (isFinite(_video.duration)) {
                _progress.value = Math.round((_video.currentTime / _video.duration) * 100);
            }
            else {
                _progress.value = 0;
            }
        });
    }
    function formatTableRow(start, end, text) {
        const jumpStr = '<td><button type="button" class="jumpCue" title="Jump to cue">&#8677;</button></td>';
        const startTime = '<td><span class="timestamp">' + (start === null ? '<button type="button" class="insertTime start" title="Set current time">Set time</button></span>' : secondsToTime(start) + '</span> <button type="button" class="insertTime update start" title="Set current time">&#128336;</button>') + '</td>';
        const endTime = '<td><span class="timestamp">' + (end === null ? '<button type="button" class="insertTime end" title="Set current time">Set time</button></span>' : secondsToTime(end) + '</span> <button type="button" class="insertTime update end" title="Set current time">&#128336;</button>') + '</td>';
        const textStr = '<td class="textinput"><textarea>' + text + '</textarea><button type="button" class="apply-text" title="Apply text">&#10003;</button></td>';
        const delStr = '<td><button type="button" class="delete-cue" title="Delete cue">&times;</button></td>';
        return jumpStr + startTime + endTime + textStr + delStr;
    }
    function updateLastCue(start, end, text) {
        const id = _cueList.length;
        if (id > 0) {
            let prev = _cueList[id - 1];
            prev.start = start;
            prev.end = end;
            prev.text = text;
            const rowStr = '<tr><td class="id">' + id + '</td>' + formatTableRow(start, end, text) + '</tr>';
            const tr = _cues.querySelector('tr:last-child');
            tr.setHTMLUnsafe(rowStr);
        }
    }
    function addCueAtEnd(start, end, text) {
        let id = _cueList.length;
        if (id == 1)
            analyzeScore(text);
        if (id > 1) {
            let prev = _cueList[id - 1];
            if (prev.start == start) {
                // update instead of adding row
                updateLastCue(start, end, text);
                return;
            }
        }
        const rowStr = formatTableRow(start, end, text);
        _cues.insertAdjacentHTML('beforeend', '<tr class="incomplete"><td class="id">' + (id + 1) + rowStr + '</tr>');
        let row = _cues.querySelector('tr:last-child');
        let entry = { 'start': start, 'end': end, 'text': text, 'row': row };
        _cueList.push(entry);
        _cueRows.set(row, entry);
    }
    function handleScore(delta) {
        _video.pause();
        let end = _cueList.length;
        if (end > 0) {
            let prev = _cueList[end - 1];
            let str = prev.text;
            let scores = str.split('\n', 2);
            if (scores.length > 1) {
                let s1 = scores[0];
                let k1 = countSymbols(s1);
                let v1 = parseInt(s1.substring(k1));
                let s2 = scores[1];
                let k2 = countSymbols(s2);
                let v2 = parseInt(s2.substring(k2));
                if (delta != 0) {
                    // increase or decrease score
                    if (k1 > 0) {
                        s1 = s1.substring(0, k1 + 1) + pad2(max(v1 + delta, 0));
                    }
                    else if (k2 > 0) {
                        s2 = s2.substring(0, k2 + 1) + pad2(max(v2 + delta, 0));
                    }
                }
                else {
                    // handle side out
                    if (k1 > 0) {
                        // sideout team #1
                        if (k1 == 1 && serves == 2) {
                            s1 = s1[0] + s1;
                        }
                        else {
                            s2 = s1[0] + ' ' + s2.trim();
                            s1 = s1.substring(k1 + 1);
                        }
                    }
                    else if (k2 > 0) {
                        // sideout team #2
                        if (k2 == 1 && serves == 2) {
                            s2 = s2[0] + s2;
                        }
                        else {
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
            }
            else {
                // handle single line score
                scores = str.split('-', 3);
                const parts = scores.length;
                if (parts > 1) {
                    let s1 = scores[0];
                    let v1 = parseInt(s1);
                    let s2 = scores[1];
                    let v2 = parseInt(s2);
                    let server = 1;
                    if (parts == 3) {
                        serves = 2;
                        server = parseInt(scores[2]);
                    }
                    else {
                        serves = 1;
                    }
                    if (delta != 0) {
                        // increase or decrease server's score
                        s1 = (v1 + delta).toString();
                    }
                    else {
                        if (server < serves) {
                            // increase server #
                            server = server + 1;
                        }
                        else {
                            // sideout swap server, receiver scores
                            let temp = s1;
                            s1 = s2;
                            s2 = temp;
                            server = 1;
                        }
                    }
                    let text = s1 + '-' + s2;
                    if (parts > 1) {
                        text += '-' + server;
                    }
                    addCueAtEnd(_video.currentTime, null, text);
                }
            }
        }
        else {
            let sel = _posSelect.value;
            let text = (sel != 'None') ? defaultScore : "0-0-2";
            addCueAtEnd(_video.currentTime, null, text);
        }
    }
    _playPause.addEventListener('click', function () {
        togglePlayPause();
    });
    initVideo();
    function insertNewVTTCue(cue) {
        let vtt_cue = new VTTCue(cue.start, cue.end, cue.text);
        vtt_cue.id = generateID();
        _track.addCue(vtt_cue);
        cue.cue_id = vtt_cue.id;
    }
    function getCueEntryByCueID(cue_id) {
        return _cueList.find(function (cue) {
            return cue.cue_id === cue_id;
        });
    }
    function writeCueList(cues) {
        _cueList = cues;
        _track = _video.addTextTrack('subtitles', 'English', 'en');
        let list = '';
        cues.forEach(function (cue, i) {
            if (cue.start !== null && cue.end !== null) {
                insertNewVTTCue(cue);
            }
            if (i == 1)
                analyzeScore(cue.text);
            let rowStr = formatTableRow(cue.start, cue.end, cue.text);
            list += '<tr><td class="id">' + (i + 1) + '</td>' + rowStr + '</tr>';
        });
        _cues.innerHTML = list;
        _cues.querySelectorAll('tr').forEach(function (row, i) {
            let cue = _cueList[i];
            _cueRows.set(row, cue);
            cue.row = row;
        });
        _track.mode = 'showing';
        _track.addEventListener('cuechange', function () {
            _cues.querySelectorAll('tr.active').forEach(function (row) {
                row.classList.remove('active');
            });
            if (_track.activeCues.length === 0)
                return;
            Array.from(_track.activeCues).forEach(function (entry) {
                let activeID = entry.id;
                let cue = getCueEntryByCueID(activeID);
                cue.row.classList.add('active');
            });
        });
    }
    _addCueButton.addEventListener('click', function () {
        let sel = _posSelect.value;
        let index = _cueList.length;
        let text = (sel == 'None') ? '' : (index == 0) ? 'Team 1\nTeam 2' : defaultScore;
        addCueAtEnd(_video.currentTime, null, text);
    });
    _exportVTTButton.addEventListener('click', function () {
        let content = buildContent();
        let blob = new Blob([content], { 'type': 'text/vtt' });
        let url = URL.createObjectURL(blob);
        let link = document.createElement('a');
        link.download = _vttFilename || 'subtitles.vtt';
        link.href = url;
        link.click();
    });
    _minusButton.addEventListener('click', function () {
        handleScore(-1);
    });
    _sideButton.addEventListener('click', function () {
        handleScore(0);
    });
    _plusButton.addEventListener('click', function () {
        handleScore(+1);
    });
    _progress.addEventListener('click', function (event) {
        let x = event.pageX - this.offsetLeft;
        let y = event.pageY - this.offsetTop;
        let clickedValue = x * this.max / this.offsetWidth;
        if (_video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA)
            return;
        if (isFinite(_video.duration)) {
            _video.currentTime = _video.duration / 100 * clickedValue;
        }
    });
    _previewButton.addEventListener('click', function () {
        document.body.classList.toggle('preview');
    });
    function compCues(a, b) {
        if (a.start === null) {
            return 1;
        }
        if (b.start === null) {
            return -1;
        }
        let startDiff = a.start - b.start;
        return startDiff;
    }
    function buildContent() {
        _cueList.sort(compCues);
        let count = _cueList.length;
        // Fill in missing end times with next start time or video duration
        _cueList.forEach(function (cue, index) {
            if (cue.end == null) {
                let time = (index + 1 < count) ? _cueList[index + 1].start : _video.duration;
                if (time == 0)
                    time = _video.duration;
                cue.end = time;
            }
        });
        let content = 'WEBVTT' + '\nLanguage: en\n';
        let width = 30;
        _cueList.forEach(function (cue, index) {
            let posOption = _posSelect.value;
            let text = cue.text;
            const lines = text.split('\n', 2);
            let size = 20;
            if (lines.length == 2) {
                if (index == 0) {
                    lines[0] = lines[0].trim();
                    lines[1] = lines[1].trim();
                    width = roundBy(max(lines[0].length, lines[1].length), 5) + 15;
                    lines[0] = padRight(lines[0], width);
                    lines[1] = padRight(lines[1], width);
                }
                else {
                    size = max(lines[0].length, lines[1].length);
                    lines[0] = padLeft(lines[0], size);
                    lines[1] = padLeft(lines[1], size);
                    size = roundBy(size * 2, 5);
                }
                text = lines[0] + '\n' + lines[1];
            }
            else {
                size = text.length;
            }
            content += '\n\n' + secondsToTime(cue.start) + ' --> ' + secondsToTime(cue.end);
            content += (index == 0) && (posOption != 'None')
                ? getOptionText(posOption, 'start', width, 10, 0, 90, 100 - width - 5)
                : getOptionText(posOption, 'end', size, 10, width, 90, 100);
            content += '\n' + text;
        });
        return content;
    }
    _sortCuesButton.addEventListener('click', function () {
        _cueList.sort(compCues);
        _cueList.forEach(function (cue, i) {
            _cues.appendChild(cue.row);
            cue.row.querySelector('td.id').textContent = (i + 1);
        });
    });
    function updateRowNumbers() {
        _cues.querySelectorAll('tr').forEach(function (row, i) {
            row.querySelector('td.id').textContent = (i + 1).toString();
        });
    }
    document.addEventListener('click', function (event) {
        let id, cue, cue2, row, time, timestamp, temp, was_incomplete, is_incomplete;
        const element = event.target;
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
    document.addEventListener('keyup', function (event) {
        const element = event.target;
        if (element.nodeName === 'TEXTAREA' && !_video.paused) {
            _video.pause();
        }
    });
    document.addEventListener('keydown', function (event) {
        const code = event.code;
        const element = event.target;
        const node = element.nodeName;
        if (node === 'TEXTAREA' || node === 'BUTTON')
            return;
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
    document.addEventListener('change', function (event) {
        let content, row, cue;
        const element = event.target;
        if (element.nodeName === 'TEXTAREA') {
            const cell = element;
            content = cell.value;
            row = element.closest('tr');
            cue = _cueRows.get(row);
            cue.text = content;
            if (cue.row == 1) {
                analyzeScore(content);
            }
            if (cue.cue_id !== undefined) {
                const vttcue = _track.cues.getCueById(cue.cue_id);
                vttcue.text = content;
                reinitCues();
            }
            element.closest('td').classList.remove('changed');
        }
    });
    document.addEventListener('input', function (event) {
        let row, cue;
        const element = event.target;
        if (element.nodeName !== 'TEXTAREA')
            return;
        const cell = element;
        row = element.closest('tr');
        cue = _cueRows.get(row);
        element.parentElement.classList.toggle('changed', cue.text !== cell.value);
    });
    _importVideoButton.addEventListener('click', () => {
        _importVideoFile.click();
    });
    _importVideoFile.addEventListener('change', function (event) {
        let file, url;
        const input = event.target;
        let files = input.files;
        try {
            if (files.length < 1)
                throw new Error('no file');
            file = files[0];
            if (file.size === 0)
                throw new Error('file empty');
            if (file.type.indexOf('video/') !== 0)
                throw new Error('invalid file format');
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
        }
        catch (e) {
            alert(e.message);
        }
        finally {
            resetFileInput(input);
        }
    });
    _importVTTButton.addEventListener('click', function () {
        _importVTTFile.click();
    });
    _importVTTFile.addEventListener('change', function (event) {
        let file, video, url, track;
        const input = event.target;
        let files = input.files;
        try {
            if (files.length < 1)
                throw new Error('no file');
            file = files[0];
            if (file.size === 0)
                throw new Error('file empty');
            if (_cueList.length > 0 && confirm('Load VTT will clenaup the current cues.\nContinue?') !== true) {
                return;
            }
            video = document.createElement('video');
            url = URL.createObjectURL(file);
            const track = document.createElement('track');
            track.kind = 'subtitles';
            track.label = 'English';
            track.srclang = 'en';
            track.addEventListener('error', function () {
                alert('Invalid VTT file.');
            });
            track.addEventListener('load', function () {
                let list;
                serves = 2; // restore default (pickleball)
                _cueList.forEach(function (cue) {
                    _cueRows.delete(cue.row);
                    cue.row = null;
                });
                if (_track) {
                    _track.mode = 'disabled';
                    _track = null;
                }
                _vttFilename = file.name;
                list = Array.from(this.track.cues).map(function (cue) {
                    return { 'start': cue.startTime, 'end': cue.endTime, 'text': cue.text };
                });
                writeCueList(list);
            });
            track.src = url;
            video.appendChild(track);
            track.track.mode = 'showing';
        }
        catch (e) {
            alert(e.message);
        }
        finally {
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
    function onDrop(event) {
        event.preventDefault();
        onDragEnd();
        let input;
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
        }
        else if (file.type.indexOf('video/') === 0) {
            input = _importVideoFile;
        }
        else {
            return;
        }
        input.files = files;
        let myevent = new Event('change');
        input.dispatchEvent(myevent);
    }
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js', { 'scope': '/webvtt-editor/' });
    }
});
