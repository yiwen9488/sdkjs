/*
 * (c) Copyright Ascensio System SIA 2010-2019
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
 * You can contact Ascensio System SIA at 20A-12 Ernesta Birznieka-Upisha
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

(function(){
    /**
	 * Class representing a combobox field.
	 * @constructor
     * @extends {CBaseListField}
	 */
    function CComboBoxField(sName, nPage, aRect, oDoc)
    {
        AscPDF.CBaseListField.call(this, sName, AscPDF.FIELD_TYPE.combobox, nPage, aRect, oDoc);

        this._calcOrderIndex    = 0;
        this._doNotSpellCheck   = false;
        this._editable          = false;

        // content for formatting value
        // Note: draw this content instead of main if form has a "format" action
		this.contentFormat = new AscPDF.CTextBoxContent(this, oDoc);

        this._markRect = null;
    }
    CComboBoxField.prototype = Object.create(AscPDF.CBaseListField.prototype);
	CComboBoxField.prototype.constructor = CComboBoxField;

    CComboBoxField.prototype.Draw = function() {
        if (this.IsHidden() == true)
            return;

        let oViewer         = editor.getDocumentRenderer();
        let oGraphicsWord   = oViewer.pagesInfo.pages[this.GetPage()].graphics.word;
        
        this.Recalculate();
        this.DrawBackground();
        
        let oContentToDraw = this.GetTrigger(AscPDF.FORMS_TRIGGERS_TYPES.Format) && this.IsNeedDrawHighlight() ? this.contentFormat : this.content;
        this.curContent = oContentToDraw; // запоминаем текущий контент

        if (oViewer.activeForm == this)
            this.CheckFormViewWindow();

        oGraphicsWord.AddClipRect(this.contentRect.X, this.contentRect.Y, this.contentRect.W, this.contentRect.H);
        oContentToDraw.Draw(0, oGraphicsWord);
        // redraw target cursor if field is selected
        if (oViewer.activeForm == this && oContentToDraw.IsSelectionUse() == false && oViewer.fieldFillingMode)
            oContentToDraw.RecalculateCurPos();
        
        oGraphicsWord.RemoveClip();
        this.DrawMarker();
        this.DrawBorders();
    };
    CComboBoxField.prototype.Recalculate = function() {
        let oViewer = editor.getDocumentRenderer();
        let nScale  = AscCommon.AscBrowser.retinaPixelRatio * oViewer.zoom;
        let aRect   = this.GetRect();

        let X = aRect[0];
        let Y = aRect[1];
        let nWidth = (aRect[2] - aRect[0]);
        let nHeight = (aRect[3] - aRect[1]);

        // save pos in page.
        this._pagePos = {
            x: X,
            y: Y,
            w: nWidth,
            h: nHeight
        };

        let oMargins = this.GetBordersWidth();

        let contentX        = (X + 2 * oMargins.left) * g_dKoef_pix_to_mm;
        let contentY        = (Y + oMargins.top) * g_dKoef_pix_to_mm;
        let contentXLimit   = (X + nWidth - 2 * oMargins.left - (18 / nScale)) * g_dKoef_pix_to_mm; // 18 / nScale --> Размер маркера комбобокса
        let contentYLimit   = (Y + nHeight - oMargins.bottom) * g_dKoef_pix_to_mm;

        let nContentH = this.content.GetElement(0).Get_EmptyHeight();
        contentY = (Y + nHeight / 2) * g_dKoef_pix_to_mm - nContentH / 2;

        this._formRect.X = X * g_dKoef_pix_to_mm;
        this._formRect.Y = Y * g_dKoef_pix_to_mm;
        this._formRect.W = nWidth * g_dKoef_pix_to_mm;
        this._formRect.H = nHeight * g_dKoef_pix_to_mm;
        
        this.contentRect.X = contentX;
        this.contentRect.Y = contentY;
        this.contentRect.W = contentXLimit - contentX;
        this.contentRect.H = contentYLimit - contentY;

        if (contentX != this._oldContentPos.X || contentY != this._oldContentPos.Y ||
        contentXLimit != this._oldContentPos.XLimit) {
            this.content.X      = this.contentFormat.X      = this._oldContentPos.X        = contentX;
            this.content.Y      = this.contentFormat.Y      = this._oldContentPos.Y        = contentY;
            this.content.XLimit = this.contentFormat.XLimit = this._oldContentPos.XLimit   = contentXLimit;
            this.content.YLimit = this.contentFormat.YLimit = this._oldContentPos.YLimit   = 20000;
            this.content.Recalculate_Page(0, true);
            this.contentFormat.Recalculate_Page(0, true);
        }
        else if (this.IsNeedRecalc()) {
            this.contentFormat.Content.forEach(function(element) {
                element.Recalculate_Page(0);
            });
            this.content.Content.forEach(function(element) {
                element.Recalculate_Page(0);
            });
        }

        this.SetNeedRecalc(false);
    };

    CComboBoxField.prototype.DrawMarker = function() {
        let oViewer         = editor.getDocumentRenderer();
        let nScale          = AscCommon.AscBrowser.retinaPixelRatio * oViewer.zoom;
        let oGraphicsPDF    = oViewer.pagesInfo.pages[this.GetPage()].graphics.pdf;
        let aOringRect      = this.GetOrigRect();

        // let X       = aRect[0] * nScale;
        // let Y       = aRect[1] * nScale;
        // let nWidth  = (aRect[2] - aRect[0]) * nScale;
        // let nHeight = (aRect[3] - aRect[1]) * nScale;

        let X       = this._pagePos.x * nScale;
        let Y       = this._pagePos.y * nScale;
        let nWidth  = (this._pagePos.w) * nScale;
        let nHeight = (this._pagePos.h) * nScale;
        
        let oMargins = this.GetBordersWidth(true);
        
        let nMarkWidth  = 18;
        let nMarkX      = (X + nWidth) - oMargins.left - nMarkWidth + 1;
        let nMarkHeight = nHeight - 2 * oMargins.top - 2;
        let nMarkY      = Y + oMargins.top + 1;

        // marker rect
        oGraphicsPDF.SetLineDash([]);
        oGraphicsPDF.BeginPath();
        oGraphicsPDF.SetGlobalAlpha(1);
        oGraphicsPDF.SetFillStyle("rgb(240, 240, 240)");
        oGraphicsPDF.FillRect(nMarkX, nMarkY, nMarkWidth, nMarkHeight);
        oGraphicsPDF.ClosePath();

        // marker border right part
        oGraphicsPDF.BeginPath();
        oGraphicsPDF.SetStrokeStyle("rgb(100, 100, 100)");
        oGraphicsPDF.SetLineWidth(1);
        oGraphicsPDF.MoveTo(nMarkX, nMarkY + nMarkHeight);
        oGraphicsPDF.LineTo(nMarkX + nMarkWidth, nMarkY + nMarkHeight);
        oGraphicsPDF.LineTo(nMarkX + nMarkWidth, nMarkY);
        oGraphicsPDF.Stroke();
        oGraphicsPDF.ClosePath();

        // marker border left part
        oGraphicsPDF.BeginPath();
        oGraphicsPDF.SetStrokeStyle("rgb(255, 255, 255)");
        oGraphicsPDF.MoveTo(nMarkX, nMarkY + nMarkHeight);
        oGraphicsPDF.LineTo(nMarkX, nMarkY);
        oGraphicsPDF.LineTo(nMarkX + nMarkWidth, nMarkY);
        oGraphicsPDF.Stroke();
        oGraphicsPDF.ClosePath();

        // marker icon
        let nIconW = 5 * 1.5;
        let nIconH = 3 * 1.5;
        let nStartIconX = nMarkX + nMarkWidth/2 - (nIconW)/2;
        let nStartIconY = nMarkY + nMarkHeight/2 - (nIconH)/2;

        oGraphicsPDF.BeginPath();
        oGraphicsPDF.SetFillStyle("black");
        
        oGraphicsPDF.MoveTo(nStartIconX, nStartIconY);
        oGraphicsPDF.LineTo(nStartIconX + nIconW, nStartIconY);
        oGraphicsPDF.LineTo(nStartIconX + nIconW/2, nStartIconY + nIconH);
        oGraphicsPDF.LineTo(nStartIconX, nStartIconY);
        oGraphicsPDF.Fill();

        let origX       = aOringRect[0];
        let origY       = aOringRect[1];

        this._markRect = {
            x1: (nMarkX - 1) / (X / origX),
            y1: (nMarkY - 1) / (Y / origY),
            x2: ((nMarkX - 1) + (nMarkWidth)) / (X / origX),
            y2: ((nMarkY - 1) + (nMarkHeight)) / (Y / origY)
        }
    };
    CComboBoxField.prototype.onMouseDown = function(x, y, e) {
        let oViewer         = editor.getDocumentRenderer();
        let oDoc            = this.GetDocument();
        let oActionsQueue   = oDoc.GetActionsQueue();

        function callbackAfterFocus(x, y, e) {
            let {X, Y} = AscPDF.GetPageCoordsByGlobalCoords(x, y, this.GetPage());
            var pageObject = oViewer.getPageByCoords(x - oViewer.x, y - oViewer.y);

            editor.WordControl.m_oDrawingDocument.UpdateTargetFromPaint = true;
            editor.WordControl.m_oDrawingDocument.m_lCurrentPage = 0;
            editor.WordControl.m_oDrawingDocument.m_lPagesCount = oViewer.file.pages.length;

            oViewer.Api.WordControl.m_oDrawingDocument.TargetStart();
            oViewer.Api.WordControl.m_oDrawingDocument.showTarget(true);
            
            if (pageObject.x >= this._markRect.x1 && pageObject.x <= this._markRect.x2 && pageObject.y >= this._markRect.y1 && pageObject.y <= this._markRect.y2 && this._options.length != 0) {
                editor.sendEvent("asc_onShowPDFFormsActions", this, x, y);
                this.content.MoveCursorToStartPos();
            }
            else {
                this.content.Selection_SetStart(X, Y, 0, e);
            }
            
            this.content.RecalculateCurPos();
            if (this.IsNeedDrawFromStream() == true) {
                this.SetDrawFromStream(false);
                this.AddToRedraw();
            }
            else if (this.curContent === this.contentFormat) {
                this.AddToRedraw();
            }
        }

        // вызываем выставление курсора после onFocus, если уже в фокусе, тогда сразу.
        if (oViewer.activeForm != this && this._triggers.OnFocus && this._triggers.OnFocus.Actions.length > 0)
            oActionsQueue.callBackAfterFocus = callbackAfterFocus.bind(this, x, y, e);
        else
            callbackAfterFocus.bind(this, x, y, e)();

        this.AddActionsToQueue(AscPDF.FORMS_TRIGGERS_TYPES.MouseDown);
        if (oViewer.activeForm != this)
            this.AddActionsToQueue(AscPDF.FORMS_TRIGGERS_TYPES.OnFocus);

        oViewer.activeForm = this;
    };
    
    /**
	 * Selects the specified option.
	 * @memberof CComboBoxField
	 * @typeofeditors ["PDF"]
	 */
    CComboBoxField.prototype.SelectOption = function(nIdx) {
        if (this.GetCurIdxs() == nIdx)
            return;

        this.CreateNewHistoryPoint(true);

        let oPara = this.content.GetElement(0);
        let oRun = oPara.GetElement(0);

        oRun.ClearContent();
        if (Array.isArray(this._options[nIdx])) {
            oRun.AddText(this._options[nIdx][0]);
            this._value = this._options[nIdx][0];
        }
        else {
            oRun.AddText(this._options[nIdx]);
            this._value = this._options[nIdx];
        }

        this.SetNeedRecalc(true);
        this.SetNeedCommit(true);
        this.AddToRedraw();

        this.content.MoveCursorToStartPos();
    };

    CComboBoxField.prototype.SetValue = function(sValue) {
        if (this.IsAnnot()) {
            let sTextToAdd = "";
            let nIdx = -1;
            for (let i = 0; i < this._options.length; i++) {
                if (this._options[i][1] && this._options[i][1] == sValue) {
                    sTextToAdd = this._options[i][0];
                    nIdx = i;
                    break;
                }
            }
            if (sTextToAdd == "") {
                for (let i = 0; i < this._options.length; i++) {
                    if (this._options[i] == sValue) {
                        sTextToAdd = this._options[i];
                        nIdx = i;
                        break;
                    }
                }
            }
            
            if (sTextToAdd == "")
                sTextToAdd = sValue;

            let oPara = this.content.GetElement(0);
            oPara.RemoveFromContent(1, oPara.GetElementsCount() - 1);
            let oRun = oPara.GetElement(0);
            oRun.ClearContent();

            if (sTextToAdd) {
                oRun.AddText(sTextToAdd);
                this.content.MoveCursorToStartPos();
            }

            this.SetNeedRecalc(true);
            this.SetWasChanged(true);

            this._currentValueIndices = nIdx;
            if (editor.getDocumentRenderer().IsOpenFormsInProgress)
                this.SetApiValue(sValue);
        }
        else
            this.SetApiValue(sValue);
    };
    CComboBoxField.prototype.SetValueFormat = function(sValue) {
        this.contentFormat.GetElement(0).GetElement(0).AddText(sValue);
    };

    /**
	 * Synchronizes this field with fields with the same name.
	 * @memberof CComboBoxField
	 * @typeofeditors ["PDF"]
	 */
    CComboBoxField.prototype.SyncField = function() {
        let aFields = this._doc.GetFields(this.GetFullName());
        
        TurnOffHistory();

        for (let i = 0; i < aFields.length; i++) {
            if (aFields[i] != this) {

                this._calcOrderIndex    = aFields[i]._calcOrderIndex;
                this._doNotSpellCheck   = aFields[i]._doNotSpellCheck;
                this._editable          = aFields[i]._editable;

                let oPara = this.content.GetElement(0);
                let oParaToCopy = aFields[i].content.GetElement(0);

                oPara.ClearContent();
                for (var nPos = 0; nPos < oParaToCopy.Content.length - 1; nPos++) {
                    oPara.Internal_Content_Add(nPos, oParaToCopy.GetElement(nPos).Copy());
                }
                oPara.CheckParaEnd();
                
                this._options = aFields[i]._options.slice();
                break;
            }
        }
    };
    CComboBoxField.prototype.EnterText = function(aChars, bForce)
    {
        if (this._editable == false && !bForce)
            return false;

        if (aChars.length > 0)
            this.CreateNewHistoryPoint(true);
        else
            return false;

        // Если у нас что-то заселекчено и мы вводим текст или пробел
        // и т.д., тогда сначала удаляем весь селект.
        if (this.content.IsSelectionUse()) {
            if (this.content.IsSelectionEmpty())
                this.content.RemoveSelection();
            else
                this.content.Remove(1, true, false, true);
        }
        
        let isCanEnter = this.DoKeystrokeAction(aChars);
        if (isCanEnter) {
            oPara.Set_SelectionState2(oSelState);
            this.content.Remove(1, true, false, false);
        }

        if (isCanEnter == false) {
            return false;
        }

        aChars = AscWord.CTextFormFormat.prototype.GetBuffer(oDoc.event["change"].toString());
        if (aChars.length == 0) {
            return false;
        }

        this.CreateNewHistoryPoint(true);
        this.InsertChars(aChars);

        this.SetNeedRecalc(true);
        this.SetNeedCommit(true); // флаг что значение будет применено к остальным формам с таким именем
        
        if (this.IsChanged() == false)
            this.SetWasChanged(true);

        return true;
    };
    /**
	 * Applies value of this field to all field with the same name.
	 * @memberof CComboBoxField
	 * @typeofeditors ["PDF"]
	 */
    CComboBoxField.prototype.Commit = function() {
        let aFields = this._doc.GetFields(this.GetFullName());
        let oThisPara = this.content.GetElement(0);
        
        if (this.DoFormatAction() == false) {
            this.UndoNotAppliedChanges();
            if (this.IsChanged() == false)
                this.SetDrawFromStream(true);

            return;
        }

        this.CorrectHistoryPoints();
        if (true != editor.getDocumentRenderer().isOnUndoRedo) {
            if (this.GetApiValue() != this.GetValue()) {
                if (this.GetDocument().IsNeedSkipHistory() == false) {
                    this.CreateNewHistoryPoint();
                    AscCommon.History.Add(new CChangesPDFFormValue(this, this.GetApiValue(), this.GetValue()));
                }
                this.SetApiValue(this.GetValue());
            }
        }
        
        this.UpdateIndexies();
        TurnOffHistory();

        if (aFields.length == 1)
            this.SetNeedCommit(false);

        for (let i = 0; i < aFields.length; i++) {
            aFields[i].SetWasChanged(true);

            if (this.HasShiftView())
                aFields[i].content.MoveCursorToStartPos();

            if (aFields[i] == this) {
                if (this.HasShiftView())
                    this.AddToRedraw();

                continue;
            }

            aFields[i].SetApiValue(this.GetApiValue());

            let oFieldPara = aFields[i].content.GetElement(0);
            let oThisRun, oFieldRun;
            for (let nItem = 0; nItem < oThisPara.Content.length - 1; nItem++) {
                oThisRun = oThisPara.Content[nItem];
                oFieldRun = oFieldPara.Content[nItem];
                oFieldRun.ClearContent();

                for (let nRunPos = 0; nRunPos < oThisRun.Content.length; nRunPos++) {
                    oFieldRun.AddToContent(nRunPos, oThisRun.Content[nRunPos].Copy());
                }
            }

            aFields[i]._currentValueIndices = this._currentValueIndices;
            aFields[i].SetNeedRecalc(true);
        }

        let oParaFromFormat = this.contentFormat.GetElement(0);
        for (let i = 0; i < aFields.length; i++) {
            if (aFields[i] == this)
                continue;

            let oFieldPara = aFields[i].contentFormat.GetElement(0);
            let oThisRun, oFieldRun;
            for (let nItem = 0; nItem < oParaFromFormat.Content.length - 1; nItem++) {
                oThisRun = oParaFromFormat.Content[nItem];
                oFieldRun = oFieldPara.Content[nItem];
                oFieldRun.ClearContent();

                for (let nRunPos = 0; nRunPos < oThisRun.Content.length; nRunPos++) {
                    oFieldRun.AddToContent(nRunPos, oThisRun.Content[nRunPos].Copy());
                }
            }

            aFields[i].SetNeedRecalc(true);
        }

        this.SetNeedCommit(false);
        this.needValidate = true;
    };
    CComboBoxField.prototype.InsertChars = function(aChars) {
        let oPara = this.content.GetElement(0);

        for (let index = 0; index < aChars.length; ++index) {
            let codePoint = aChars[index];
            if (9 === codePoint) // \t
				oPara.AddToParagraph(new AscWord.CRunTab(), true);
			else if (10 === codePoint || 13 === codePoint) // \n \r
				oPara.AddToParagraph(new AscWord.CRunBreak(AscWord.break_Line), true);
			else if (AscCommon.IsSpace(codePoint)) // space
				oPara.AddToParagraph(new AscWord.CRunSpace(codePoint), true);
			else
				oPara.AddToParagraph(new AscWord.CRunText(codePoint), true);
        }
    };
    /**
	 * Checks curValueIndex, corrects it and return.
	 * @memberof CComboBoxField
	 * @typeofeditors ["PDF"]
     * @returns {number}
	 */
    CComboBoxField.prototype.UpdateIndexies = function() {
        let sValue = this.content.GetElement(0).GetText({ParaEndToSpace: false});
        this._value = sValue;
        let nIdx = -1;
        for (let i = 0; i < this._options.length; i++) {
            if (this._options[i][0] === sValue) {
                nIdx = i;
                break;
            }
        }
        for (let i = 0; i < this._options.length; i++) {
            if (this._options[i] === sValue) {
                nIdx = i;
                break;
            }
        }

        this._currentValueIndices = nIdx;
        return nIdx;
    };

    CComboBoxField.prototype.SetEditable = function(bValue) {
        this._editable = bValue;
    };
    CComboBoxField.prototype.SetOptions = function(aOpt) {
        let aOptToPush = [];
        for (let i = 0; i < aOpt.length; i++) {
            if (aOpt[i] == null)
                continue;
            if (typeof(aOpt[i]) == "string" && aOpt[i] != "")
                aOptToPush.push(aOpt[i]);
            else if (Array.isArray(aOpt[i]) && aOpt[i][0] != undefined && aOpt[i][1] != undefined) {
                if (aOpt[i][0].toString && aOpt[i][1].toString) {
                    aOptToPush.push([aOpt[i][0].toString(), aOpt[i][1].toString()])
                }
            }
            else if (typeof(aOpt[i]) != "string" && aOpt[i].toString) {
                aOptToPush.push(aOpt[i].toString());
            }
        }

        this._options = aOptToPush;
    };
    CComboBoxField.prototype.GetValue = function() {
        // to do обработать rich value
        let sValue = this.content.GetElement(0).GetText({ParaEndToSpace: false});
        for (let i = 0; i < this._options.length; i++) {
            if (Array.isArray(this._options[i])) {
                if (this._options[i][0] == sValue)
                    return this._options[i][1];
            }
        }
        
        return sValue;
    };
    

    /**
	 * Gets current index (can be not commited to all with the same name).
	 * @memberof CComboBoxField
	 * @typeofeditors ["PDF"]
	 */
    CComboBoxField.prototype.GetCurIdxs = function() {
        let sValue = this.content.GetElement(0).GetText({ParaEndToSpace: false});
        for (let i = 0; i < this._options.length; i++) {
            if (Array.isArray(this._options[i])) {
                if (this._options[i][0] == sValue)
                    return i;
            }
        }
        
        return -1;
    };
	
    function TurnOffHistory() {
        if (AscCommon.History.IsOn() == true)
            AscCommon.History.TurnOff();
    }

    if (!window["AscPDF"])
	    window["AscPDF"] = {};
    
    CComboBoxField.prototype.Remove                 = AscPDF.CTextField.prototype.Remove;
    CComboBoxField.prototype.MoveCursorLeft         = AscPDF.CTextField.prototype.MoveCursorLeft;
    CComboBoxField.prototype.MoveCursorRight        = AscPDF.CTextField.prototype.MoveCursorRight;
    CComboBoxField.prototype.SelectionSetStart      = AscPDF.CTextField.prototype.SelectionSetStart;
    CComboBoxField.prototype.SelectionSetEnd        = AscPDF.CTextField.prototype.SelectionSetEnd;
    CComboBoxField.prototype.CheckFormViewWindow    = AscPDF.CTextField.prototype.CheckFormViewWindow;
    CComboBoxField.prototype.SetAlign               = AscPDF.CTextField.prototype.SetAlign;
    CComboBoxField.prototype.SetDoNotSpellCheck     = AscPDF.CTextField.prototype.SetDoNotSpellCheck;
    CComboBoxField.prototype.CorrectHistoryPoints   = AscPDF.CTextField.prototype.CorrectHistoryPoints;
    CComboBoxField.prototype.DoValidateAction       = AscPDF.CTextField.prototype.DoValidateAction;
    CComboBoxField.prototype.DoKeystrokeAction      = AscPDF.CTextField.prototype.DoKeystrokeAction;
    CComboBoxField.prototype.DoFormatAction         = AscPDF.CTextField.prototype.DoFormatAction;
    CComboBoxField.prototype.CalcDocPos             = AscPDF.CTextField.prototype.CalcDocPos;

	window["AscPDF"].CComboBoxField = CComboBoxField;
})();

