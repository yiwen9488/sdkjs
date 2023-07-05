/*
 * (c) Copyright Ascensio System SIA 2010-2023
 *
 * This program is a free software product. You can redistribute it and/or
 * modify it under the terms of the GNU Affero General Public License (AGPL)
 * version 3 as published by the Free Software Foundation. In accordance with
 * Section 7(a) of the GNU AGPL its Section 15 shall be amended to the effect
 * that Ascensio System SIA expressly excludes the warranty of non-infringement
 * of any third-party rights.
 *
 * This program is distributed WITHOUT ANY WARRANTY; without even the implied
 * warranty of MERCHANTABILITY or FITNESS FOR A PARTICULAR  PURPOSE. For
 * details, see the GNU AGPL at: http://www.gnu.org/licenses/agpl-3.0.html
 *
 * You can contact Ascensio System SIA at 20A-6 Ernesta Birznieka-Upish
 * street, Riga, Latvia, EU, LV-1050.
 *
 * The  interactive user interfaces in modified source and object code versions
 * of the Program must display Appropriate Legal Notices, as required under
 * Section 5 of the GNU AGPL version 3.
 *
 * Pursuant to Section 7(b) of the License you must retain the original Product
 * logo when distributing the program. Pursuant to Section 7(e) we decline to
 * grant you any rights under trademark law for use of our trademarks.
 *
 * All the Product's GUI elements, including illustrations and icon sets, as
 * well as technical writing content are licensed under the terms of the
 * Creative Commons Attribution-ShareAlike 4.0 International. See the License
 * terms at http://creativecommons.org/licenses/by-sa/4.0/legalcode
 *
 */

window.IS_NATIVE_EDITOR = true;

window.NativeSupportTimeouts = true;
window.NativeTimeoutObject = {};

var clearTimeout = function(id) {
    if (!window.NativeSupportTimeouts)
        return;

    window.NativeTimeoutObject["" + id] = undefined;
    window["native"]["ClearTimeout"](id);
}

var setTimeout = function(func, interval) {
    if (!window.NativeSupportTimeouts)
        return;

    var id = window["native"]["GenerateTimeoutId"](interval);
    window.NativeTimeoutObject["" + id] = {"func": func, repeat: false};

    return id;
}

var clearInterval = function(id) {
    if (!window.NativeSupportTimeouts)
        return;
    

    window.NativeTimeoutObject["" + id] = undefined;
    window["native"]["ClearTimeout"](id);
}

var setInterval = function(func, interval) {
    if (!window.NativeSupportTimeouts)
        return;

    var id = window["native"]["GenerateTimeoutId"](interval);
    window.NativeTimeoutObject["" + id] = {func: func, repeat: true, interval: interval};

    return id;
}

window.native.Call_TimeoutFire = function(id) {
    if (!window.NativeSupportTimeouts)
        return;

    var prop = "" + id;

    if (undefined === window.NativeTimeoutObject[prop]) {
        return;
    }

    var func = window.NativeTimeoutObject[prop].func;
    var repeat = window.NativeTimeoutObject[prop].repeat;
    var interval = window.NativeTimeoutObject[prop].interval;

    window.NativeTimeoutObject[prop] = undefined;

    if (!func)
        return;

    func.call(null);

    if (repeat) {
        setInterval(func, interval);
    }

    func = null;
};

function offline_timeoutFire(id) {
	return window.native.Call_TimeoutFire(id);
}

var console = {
	log : function(param) { window["native"]["ConsoleLog"](param); },
	time : function (param) {},
	timeEnd : function (param) {}
};

window["NativeCorrectImageUrlOnPaste"] = function (url)
{
	return window["native"]["CorrectImageUrlOnPaste"](url);
};
window["NativeCorrectImageUrlOnCopy"] = function (url)
{
	return window["native"]["CorrectImageUrlOnCopy"](url);
};

function NativeCalculateFile()
{
    Asc.editor.asc_nativeCalculateFile();
}

window.native.Call_OnUpdateOverlay = function(param)
{
    return window["API"].Call_OnUpdateOverlay(param);
};

window.native.Call_OnMouseDown = function(e)
{
    return window["API"].Call_OnMouseDown(e);
};
window.native.Call_OnMouseUp = function(e)
{
    return window["API"].Call_OnMouseUp(e);
};
window.native.Call_OnMouseMove = function(e)
{
    return window["API"].Call_OnMouseMove(e);
};
window.native.Call_OnCheckMouseDown = function(e)
{
    return window["API"].Call_OnCheckMouseDown(e);
};

window.native.Call_OnKeyDown = function(e)
{
    return window["API"].Call_OnKeyDown(e);
};
window.native.Call_OnKeyPress = function(e)
{
    return window["API"].Call_OnKeyPress(e);
};
window.native.Call_OnKeyUp = function(e)
{
    return window["API"].Call_OnKeyUp(e);
};
window.native.Call_OnKeyboardEvent = function(e)
{
    return window["API"].Call_OnKeyboardEvent(e);
};

window.native.Call_Menu_Event = function (type, _params)
{
    return window["API"].Call_Menu_Event(type, _params);
};