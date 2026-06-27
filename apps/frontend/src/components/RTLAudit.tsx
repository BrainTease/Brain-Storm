'use client';

/**
 * RTLAudit Component
 * 
 * This component provides helpers and documentation for RTL (right-to-left) auditing.
 * Use this to identify and fix layout issues in RTL languages.
 * 
 * RTL Support Checklist:
 * ✓ HTML dir attribute: Set on <html> element (controlled in layout.tsx)
 * ✓ CSS logical properties: Use ps/pe/start/end instead of left/right/pl/pr
 * ✓ Icon mirroring: directional icons should be mirrored (see useIsRTL hook)
 * ✓ Text direction: Automatic with dir="rtl" attribute
 * ✓ Flex/Grid alignment: Test layouts flex-row vs flex-col in RTL
 * 
 * Common Issues to Check:
 * - Hard-coded left/right values (use logical properties instead)
 * - Absolute positioned elements (position: absolute with left/right)
 * - Fixed width elements causing overflow
 * - Icon direction (chevrons, arrows should mirror)
 * - Text with directional indicators like "→" should mirror
 * - Border radius corners (border-radius: 0 0 10px 0)
 */

export function RTLAudit() {
  return (
    <div className="hidden">
      {/* This component is non-visual and serves as documentation */}
      {/* RTL support is implemented through: */}
      {/* 1. useIsRTL() hook for client-side RTL detection */}
      {/* 2. isRTLLocale() function in routing.ts for server-side detection */}
      {/* 3. dir attribute on <html> element in layout.tsx */}
      {/* 4. CSS logical properties in components (ps-4, me-2, text-start, etc.) */}
      {/* 5. RTL-specific utilities in globals.css for animations and custom styles */}
    </div>
  );
}

/**
 * Helper to detect common RTL issues in the DOM
 * Run this in the browser console to audit RTL implementation
 */
export function auditRTLImplementation() {
  console.group('🌐 RTL Implementation Audit');

  // Check 1: HTML dir attribute
  const htmlElement = document.documentElement;
  const dirAttribute = htmlElement.getAttribute('dir');
  console.log(
    `✓ HTML dir attribute: ${dirAttribute}`,
    dirAttribute === 'rtl' ? '✅' : '⚠️'
  );

  // Check 2: HTML lang attribute
  const langAttribute = htmlElement.getAttribute('lang');
  console.log(`✓ HTML lang attribute: ${langAttribute}`);

  // Check 3: Elements with hard-coded left/right (potential issues)
  const elementsWithLeftRight = document.querySelectorAll(
    '[style*="left:"], [style*="right:"], [style*="margin-left:"], [style*="margin-right:"], [style*="padding-left:"], [style*="padding-right:"]'
  );

  if (elementsWithLeftRight.length > 0) {
    console.warn(
      `⚠️ Found ${elementsWithLeftRight.length} elements with hard-coded left/right styles:`,
      elementsWithLeftRight
    );
  } else {
    console.log('✓ No hard-coded left/right styles detected');
  }

  // Check 4: Flex/Grid layouts (should work with dir attribute)
  const flexElements = document.querySelectorAll('[style*="display: flex"], [style*="display: grid"]');
  console.log(`✓ Found ${flexElements.length} flex/grid elements`);

  // Check 5: Images with transform scale-x-[-1] for mirroring
  const mirroredImages = document.querySelectorAll('svg.scale-x-\\[-1\\], img.scale-x-\\[-1\\]');
  console.log(`✓ Found ${mirroredImages.length} mirrored directional icons`);

  // Check 6: Text alignment
  const elements = document.querySelectorAll('*');
  let textAlignStart = 0;
  let textAlignEnd = 0;

  elements.forEach((el) => {
    const style = window.getComputedStyle(el);
    if (style.textAlign === 'start') textAlignStart++;
    if (style.textAlign === 'end') textAlignEnd++;
  });

  console.log(`✓ Text alignment: ${textAlignStart} elements with text-align:start, ${textAlignEnd} with text-align:end`);

  console.groupEnd();
}
