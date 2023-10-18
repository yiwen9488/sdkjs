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

"use strict";

(function(window)
{
	/**
	 * Класс для композитного ввода в ран
	 * @param canSplit {boolean} можно ли разделять run во время ввода
	 * @constructor
	 */
	function RunCompositeInput(canSplit)
	{
		this.canSplit = false !== canSplit;
		
		this.run     = null;
		this.pos     = 0;
		this.length  = 0;
		this.canUndo = true;
		
		this.prevRun = null;
		this.checkCS = false;
	}
	
	RunCompositeInput.prototype.begin = function(run)
	{
		let newRun = null;
		let checkCS = false;
		if (!run.GetParentForm() && this.canSplit)
		{
			checkCS = true;
			newRun = run.CheckRunBeforeAdd();
			if (!newRun)
				newRun = run.private_SplitRunInCurPos();
		}
		
		let prevRun = null;
		if (newRun && run !== newRun)
		{
			prevRun = run;
			run = newRun;
			run.Make_ThisElementCurrent();
		}
		
		this.run     = run;
		this.pos     = run.State.ContentPos;
		this.length  = 0;
		this.canUndo = true;
		this.checkCS = checkCS;
		this.prevRun = prevRun;
		
		run.Set_CompositeInput(this);
	};
	RunCompositeInput.prototype.end = function()
	{
		if (!this.run)
			return;
		
		this.run.Set_CompositeInput(null);
		this.run = null;
		this.length = 0;
	};
	RunCompositeInput.prototype.getLength = function()
	{
		return this.length;
	};
	RunCompositeInput.prototype.replace = function(codePoints)
	{
		if (!this.run)
			return;
		
		codePoints = typeof(codePoints) === "string" ? codePoints.codePointsArray() : codePoints;
		
		if (!this.length && !codePoints.length)
			return;
		
		if (codePoints.length)
			this.checkComplexScript(AscCommon.IsComplexScript(codePoints[0]));
		
		this.remove(this.length);
		for (let index = 0, count = codePoints.length; index < count; ++index)
		{
			this.add(codePoints[index]);
		}
		
		let parentForm = this.run.GetParentForm();
		if (parentForm)
		{
			parentForm.TrimTextForm();
			
			if (this.run.IsEmpty())
			{
				parentForm.ReplaceContentWithPlaceHolder();
				AscCommon.g_inputContext.externalEndCompositeInput();
			}
		}
	};
	RunCompositeInput.prototype.remove = function(count)
	{
		let pos = this.pos + this.length;
		
		count = Math.max(0, Math.min(count, this.length, this.run.GetElementsCount(), pos));
		if (!count)
			return;
		
		this.run.RemoveFromContent(pos - count, count, true);
		this.length -= count;
	};
	RunCompositeInput.prototype.add = function(codePoint)
	{
		let runElement = AscWord.codePointToRunElement(codePoint, this.run.IsMathRun());
		this.run.AddToContent(this.pos + this.length, runElement, true);
		++this.length;
	};
	RunCompositeInput.prototype.setPos = function(pos)
	{
		pos = Math.max(0, Math.min(pos, this.length, this.run.GetElementsCount() - this.pos));
		this.run.State.ContentPos = this.pos + pos;
	};
	RunCompositeInput.prototype.getPos = function()
	{
		let inRunPos = this.run.State.ContentPos;
		return Math.min(this.length, Math.max(0, inRunPos - this.pos));
	};
	RunCompositeInput.prototype.getRun = function()
	{
		return this.run;
	};
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	// Private area
	////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
	RunCompositeInput.prototype.checkComplexScript = function(isCS)
	{
		if (!this.checkCS)
			return;
		
		this.run.ApplyComplexScript(isCS);
		if (this.prevRun
			&& isCS !== this.prevRun.IsCS()
			&& this.prevRun.IsOnlyCommonTextScript())
		{
			this.prevRun.ApplyComplexScript(isCS);
		}
		
		this.checkCS = false;
	};
	//--------------------------------------------------------export----------------------------------------------------
	AscWord.RunCompositeInput = RunCompositeInput;
	
})(window);

