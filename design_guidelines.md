# Virtual Fitting App - Design Guidelines

## Design Approach

**Reference-Based Approach**: Drawing inspiration from premium fashion e-commerce (Zara, ASOS) and visual transformation tools (Canva, Sephora Virtual Artist) to create a sophisticated, image-centric experience that builds user confidence in their virtual fitting results.

**Core Principle**: Emphasize visual clarity and transformation - the app should make users feel excited about seeing themselves in new items while maintaining professional credibility.

---

## Color Palette

### Light Mode
- **Primary Brand**: 17 85% 35% (Deep teal - sophisticated fashion feel)
- **Secondary**: 340 75% 55% (Coral accent - energy and warmth)
- **Background**: 0 0% 98% (Soft white)
- **Surface**: 0 0% 100% (Pure white for cards)
- **Text Primary**: 220 15% 20% (Deep charcoal)
- **Text Secondary**: 220 10% 45% (Medium gray)

### Dark Mode
- **Primary Brand**: 17 70% 60% (Lighter teal for visibility)
- **Secondary**: 340 65% 65% (Softer coral)
- **Background**: 220 18% 12% (Rich dark blue-black)
- **Surface**: 220 15% 18% (Elevated dark surface)
- **Text Primary**: 0 0% 95% (Off-white)
- **Text Secondary**: 220 5% 65% (Light gray)

---

## Typography

**Primary Font**: 'Inter' (Google Fonts)
- Modern, highly legible, excellent for both headings and UI

**Hierarchy**:
- **Hero Heading**: text-5xl md:text-6xl, font-bold, tracking-tight
- **Section Titles**: text-3xl md:text-4xl, font-semibold
- **Card Titles**: text-xl, font-semibold
- **Body Text**: text-base, font-normal, leading-relaxed
- **UI Labels**: text-sm, font-medium, tracking-wide uppercase
- **Captions**: text-xs, text-secondary

---

## Layout System

**Spacing Units**: Use Tailwind spacing of 4, 6, 8, 12, 16 for consistency
- Component padding: p-6 to p-8
- Section spacing: py-12 md:py-16 lg:py-20
- Card gaps: gap-6 to gap-8
- Page margins: px-4 md:px-8 lg:px-12

**Grid System**:
- Upload section: 2-column on desktop (user photo | clothing item)
- Results gallery: 1-column focus with before/after side-by-side
- Max container width: max-w-7xl mx-auto

---

## Component Library

### Image Upload Zones
- Large drag-and-drop areas with dashed borders (border-2 border-dashed)
- Upload icons (use Heroicons: ArrowUpTray, PhotoIcon)
- Clear visual states: empty, uploading (progress), uploaded (preview)
- Preview thumbnails with remove option (X icon overlay)
- Support text: "Drag & drop or click to upload"

### Before/After Viewer
- Side-by-side comparison on desktop, stacked on mobile
- Equal height containers with object-fit cover
- Labels: "Original" and "Virtual Try-On" above each image
- Subtle separator line between images
- Background: Surface color with subtle shadow

### Action Buttons
- Primary CTA (Generate Fitting): Large, full-width on mobile, fixed width on desktop
- Download button: Secondary style with download icon (Heroicons: ArrowDownTray)
- Clear/Reset: Outline variant with ghost appearance

### Navigation
- Top bar with app logo/name on left
- Minimal navigation: "New Fitting" and "Gallery" (if saved results feature)
- Account/settings icon on right

### Progress Indicator
- Linear progress bar during AI processing
- Estimated time display
- Subtle animation (smooth indeterminate or percentage-based)

### Result Cards
- Clean white/dark surface cards with rounded corners (rounded-xl)
- Image fills card width, maintains aspect ratio
- Download button positioned bottom-right as overlay or below image
- Soft shadow for depth (shadow-lg)

---

## Images

### Hero Section
**Large Hero Image**: Yes - Full-width hero showcasing transformation example
- **Description**: Split-screen hero image showing before/after virtual fitting result - left side shows person in plain clothing, right side shows same person virtually fitted in stylish outfit
- **Placement**: Top of landing page, height: 70vh on desktop, 50vh on mobile
- **Treatment**: Subtle gradient overlay at bottom for text readability

### Upload Interface Images
- **Placeholder Icons**: Use Heroicons for empty states (PhotoIcon, UserIcon, ShoppingBagIcon)
- **Example Thumbnails**: Small reference images showing ideal upload quality (clear, well-lit photos)

---

## Animations

**Minimal and Purposeful**:
- Upload zone: Subtle scale transform on drag-over (scale-105)
- Button interactions: Built-in hover states only
- Image loading: Gentle fade-in when results appear
- Progress: Smooth progress bar animation during processing
- No decorative or scroll-triggered animations

---

## Key UX Patterns

1. **Clear Upload Flow**: Two distinct upload zones side-by-side, labeled "Your Photo" and "Clothing Item"
2. **Instant Preview**: Show uploaded images immediately with edit/remove options
3. **Processing Transparency**: Clear progress indication with estimated time
4. **Result Focus**: Large, prominent display of virtual fitting result
5. **Quick Actions**: Easy download and "Try Another" workflow
6. **Responsive Behavior**: Single column on mobile with logical stacking order

---

## Accessibility & Polish

- High contrast ratios maintained in both themes (WCAG AA minimum)
- Focus states: Visible ring (ring-2 ring-primary ring-offset-2)
- Alt text for all images, including uploaded content
- Keyboard navigation support for all interactive elements
- Loading states with appropriate ARIA labels
- Error messaging: Clear, actionable feedback for upload failures or API errors