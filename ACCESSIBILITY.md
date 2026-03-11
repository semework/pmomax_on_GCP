# Accessibility Statement
**PMOMax PID Architect**  
**Last Updated:** November 25, 2025  
**Version:** 1.0.18 (Rev 00030)

## Commitment to Accessibility

PMOMax PID Architect is committed to ensuring digital accessibility for people with disabilities. We are continually improving the user experience for everyone and applying the relevant accessibility standards.

## Conformance Status

**Target Standard:** Web Content Accessibility Guidelines (WCAG) 2.1 Level AA

**Current Status:** Partial Conformance

We are actively working towards full WCAG 2.1 Level AA conformance. This means that parts of the content do not fully conform to the accessibility standard.

## Accessibility Features Implemented

### Keyboard Navigation ✅
- All interactive elements accessible via keyboard (Tab, Enter, Space, Arrow keys)
- Logical tab order maintained throughout application
- Focus indicators visible on all focusable elements
- Skip-to-content link available
- Escape key closes dialogs and dropdowns

### Screen Reader Support ✅
- Semantic HTML5 elements (header, nav, main, article, section, footer)
- ARIA labels on all interactive components
- ARIA roles assigned appropriately (button, dialog, alert, progressbar)
- Form labels associated with inputs
- Alternative text for informative images
- Descriptive link text (no "click here" links)

### Visual Accessibility ⚠️ Partial
- Font sizes adjustable via browser zoom (tested up to 200%)
- Sufficient color contrast for most text (minimum 4.5:1)
- Text remains readable when colors are overridden
- No information conveyed by color alone
- **Known Issues:**
  - Some chart labels may not meet 4.5:1 contrast ratio
  - PDF preview may have contrast issues

### Motion & Animation ✅
- Reduced motion respected (prefers-reduced-motion CSS)
- No automatically playing audio or video
- Animations can be paused or disabled
- No flashing content (threshold <3 flashes per second)

### Form Accessibility ✅
- All form fields have associated labels
- Required fields clearly marked
- Error messages descriptive and programmatically associated
- Form validation errors announced to screen readers
- Progress indicators for multi-step processes

## Known Accessibility Issues

### High Priority 🔴
1. **Color Contrast - Gantt Chart**
   - **Issue:** Some Gantt task bars may not meet 4.5:1 contrast ratio against background
   - **Affected Users:** Low vision users
   - **Workaround:** Task names also displayed in adjacent table with sufficient contrast
   - **Fix ETA:** Version 1.1.0 (Q1 2026)

2. **PDF Preview Alt Text**
   - **Issue:** PDF canvas preview lacks comprehensive alt text
   - **Affected Users:** Screen reader users
   - **Workaround:** Extracted text available in PID form
   - **Fix ETA:** Version 1.0.19 (December 2025)

### Medium Priority 🟡
3. **Focus Trap in File Upload Dialog**
   - **Issue:** Focus occasionally escapes dialog during drag-and-drop
   - **Affected Users:** Keyboard-only users
   - **Workaround:** Use Browse button instead of drag-and-drop
   - **Fix ETA:** Version 1.0.19 (December 2025)

4. **Chart Data Tables**
   - **Issue:** Gantt chart lacks accompanying data table
   - **Affected Users:** Screen reader users, users with cognitive disabilities
   - **Workaround:** Timeline information available in PID fields
   - **Fix ETA:** Version 1.1.0 (Q1 2026)

### Low Priority 🟢
5. **Timing Adjustments**
   - **Issue:** No explicit timing controls for AI assistant responses
   - **Affected Users:** Users who need more time to read
   - **Workaround:** Responses remain on screen indefinitely
   - **Fix ETA:** Backlog

## Testing Completed

### Manual Testing ✅
- **Keyboard Navigation:** Full site navigation without mouse - PASS
- **Screen Reader:** NVDA (Windows), VoiceOver (macOS) - PASS with minor issues
- **Browser Zoom:** Tested 100%-200% - PASS
- **Color Blindness:** Coblis simulator (protanopia, deuteranopia) - PASS
- **Reduced Motion:** prefers-reduced-motion CSS query - PASS

### Automated Testing ⚠️
- **axe DevTools:** 12 issues identified, 8 fixed
- **WAVE:** 3 contrast warnings remaining
- **Lighthouse Accessibility Score:** 89/100

### Pending Audits 📋
- **Third-party Accessibility Audit:** Scheduled Q1 2026
- **WCAG 2.1 Level AA Certification:** Planned Q2 2026

## Browser & Assistive Technology Compatibility

### Supported Browsers
- **Chrome:** Version 96+ (Recommended)
- **Firefox:** Version 94+
- **Safari:** Version 15+
- **Edge:** Version 96+

### Tested Assistive Technologies
- **NVDA:** Version 2021.3+ (Windows)
- **JAWS:** Version 2021+ (Windows)
- **VoiceOver:** macOS 12+ (Monterey)
- **TalkBack:** Android 11+
- **Narrator:** Windows 10+

### Known Limitations
- Internet Explorer 11: Not supported
- Mobile browsers: Some features may require desktop browsers
- PDF parsing: Large files may cause performance issues on older devices

## Third-Party Content

**Google Gemini API:**
- AI-generated content may contain unpredictable formatting
- We cannot guarantee accessibility of AI-generated text
- Users can edit AI outputs to improve accessibility

**PDF.js Library:**
- PDF rendering provided by Mozilla PDF.js
- Accessibility of rendered PDFs depends on source document quality
- Text extraction preserves reading order where possible

## Feedback & Support

We welcome your feedback on the accessibility of PMOMax PID Architect.

### Report Accessibility Issues
- **Email:** accessibility@pmomax.ai
- **Subject Line:** "Accessibility Issue - [Brief Description]"
- **Please Include:**
  - Description of the issue
  - URL or feature affected
  - Browser and assistive technology used
  - Steps to reproduce
  - Severity (Critical / High / Medium / Low)

### Response Times
- **Critical:** Response within 24 hours, fix within 7 days
- **High:** Response within 48 hours, fix within 30 days
- **Medium:** Response within 5 days, fix within 90 days
- **Low:** Response within 10 days, fix as resources allow

### Alternative Formats
If you require content in an alternative format (large print, audio, accessible PDF), please contact us at accessibility@pmomax.ai with your request.

## Continuous Improvement

We are committed to ongoing accessibility improvements:

### Current Quarter (Q4 2025)
- Fix PDF preview alt text
- Resolve focus trap in upload dialog
- Improve Gantt chart contrast
- Add data table equivalent for charts

### Next Quarter (Q1 2026)
- Complete third-party accessibility audit
- Implement audit recommendations
- Add timing controls for timed content
- Enhance keyboard shortcuts documentation

### Future Enhancements
- WCAG 2.1 Level AAA conformance for critical workflows
- Accessibility preferences dashboard
- User-customizable color themes
- Enhanced screen reader announcements
- Comprehensive keyboard shortcuts cheat sheet

## Legal & Standards

This accessibility statement is based on:
- **WCAG 2.1:** https://www.w3.org/WAI/WCAG21/quickref/
- **Section 508:** https://www.section508.gov/
- **ADA Title III:** Americans with Disabilities Act

**Last Audited:** November 20, 2025  
**Next Scheduled Audit:** February 1, 2026  
**Accessibility Coordinator:** TBD (accessibility@pmomax.ai)

---

**This statement was last reviewed and updated on November 25, 2025.**
