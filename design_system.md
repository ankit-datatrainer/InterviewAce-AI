---
name: Cognitive Edge
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#bec7d4'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#88919d'
  outline-variant: '#3f4852'
  surface-tint: '#98cbff'
  primary: '#98cbff'
  on-primary: '#003354'
  primary-container: '#00a3ff'
  on-primary-container: '#00375a'
  inverse-primary: '#00629d'
  secondary: '#d0bcff'
  on-secondary: '#3c0091'
  secondary-container: '#571bc1'
  on-secondary-container: '#c4abff'
  tertiary: '#bec6e0'
  on-tertiary: '#283044'
  tertiary-container: '#949cb5'
  on-tertiary-container: '#2c3448'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#cfe5ff'
  primary-fixed-dim: '#98cbff'
  on-primary-fixed: '#001d33'
  on-primary-fixed-variant: '#004a77'
  secondary-fixed: '#e9ddff'
  secondary-fixed-dim: '#d0bcff'
  on-secondary-fixed: '#23005c'
  on-secondary-fixed-variant: '#5516be'
  tertiary-fixed: '#dae2fd'
  tertiary-fixed-dim: '#bec6e0'
  on-tertiary-fixed: '#131b2e'
  on-tertiary-fixed-variant: '#3f465c'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 72px
    fontWeight: '800'
    lineHeight: '1.1'
    letterSpacing: -0.04em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 48px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.3'
    letterSpacing: -0.02em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.7'
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.6'
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1280px
  gutter: 24px
  margin-desktop: 64px
  margin-mobile: 20px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
  section-gap: 120px
---

## Brand & Style
The design system is engineered to convey **intelligence, exclusivity, and technological mastery**. It serves a target audience of ambitious professionals seeking a competitive edge in their careers through AI-augmented preparation.

The aesthetic follows a **Premium Glassmorphic** direction. This is characterized by deep, layered backgrounds that use subtle radial gradients to create a sense of infinite digital space. UI elements utilize frosted-glass translucency, allowing the background depth to bleed through, while "high-tech" accents in electric cyan provide a focused visual energy. The overall mood is sophisticated yet innovative—moving away from traditional corporate stiffness toward a future-forward, sleek digital environment.

## Colors
The palette is rooted in a **Dark Mode** first philosophy. 

- **Foundational Neutrals:** Deep Charcoal (#0B0E14) and Midnight Blue (#0F172A) form the base of the interface, providing a high-contrast canvas for content.
- **Electric Cyan:** Used for primary actions, success states, and the core "AI signature." It represents the energy of the platform.
- **Soft Violet:** Employed as a secondary accent for deep AI processes, personalized insights, and premium features, creating a sophisticated "glow" effect when paired with cyan.
- **Text:** High-contrast White (#FFFFFF) for headlines to ensure maximum impact, and Muted Slate (#94A3B8) for secondary body text to maintain hierarchy and reduce eye strain.

## Typography
This design system utilizes a dual-font strategy to balance impact with utility.

**Plus Jakarta Sans** is used for all display and headline roles. Its contemporary, geometric structure is tightened with **negative letter-spacing (-2% to -4%)** to create a dense, premium "editorial" feel typical of high-end tech branding.

**Inter** handles all body copy and functional labels. It is configured with a **generous line height (1.6x - 1.7x)** to ensure readability during long reading sessions, such as resume feedback or mock interview transcripts. Large display sizes must scale down aggressively for mobile to prevent layout breaking, while maintaining their heavy font weight.

## Layout & Spacing
The layout follows a **Fluid-Fixed Hybrid** model. Content is contained within a 1280px max-width container to maintain readability on ultra-wide monitors, while the background gradients and grid patterns bleed to the edges of the viewport.

A **12-column grid** is used for desktop, shifting to a **4-column grid** for mobile devices. Spacing is intentionally "airy" to allow the glassmorphic elements to breathe. Large vertical gaps (120px+) between sections emphasize the minimalist, premium nature of the brand. Micro-spacing follows an 8px base unit for consistent alignment across components.

## Elevation & Depth
Depth is the cornerstone of this design system, achieved through **layered translucency** rather than traditional heavy shadows.

- **Surface Layers:** Surfaces use a semi-transparent fill (e.g., White at 5-10% opacity) with a `backdrop-filter: blur(20px)`. 
- **Glass Borders:** Every container features a 1px solid border with a subtle gradient (White at 20% to Transparent) to simulate the "catch-light" on the edge of glass.
- **Glow Effects:** Instead of black shadows, "AI" components emit a soft, colored outer glow using the Primary Cyan or Secondary Violet at very low opacities (15%). 
- **Z-Index Philosophy:** Higher elevation levels are indicated by increased background blur and slightly brighter border strokes.

## Shapes
The shape language is consistently **Rounded**, using generous corner radii to soften the "high-tech" edge and make the AI feel approachable.

Standard components like cards and input fields utilize a **16px (1rem)** radius. Large layout containers or featured "hero" glass cards should use **24px (1.5rem)**. Small interactive elements like chips or badges may utilize a fully pill-shaped radius to distinguish them from structural elements.

## Components

- **Buttons:** Primary buttons use a vibrant Cyan-to-Blue gradient with white text. Secondary buttons are "ghost" style with a glass border. Hover states should include a subtle "inner glow" effect.
- **Glass Cards:** The primary container for content. Must include the signature 1px edge stroke and backdrop blur. 
- **AI Badges:** Small, pill-shaped indicators with a subtle Violet pulse animation to signify active AI processing or "InterviewReady" status.
- **Input Fields:** Dark, semi-transparent backgrounds with cyan focus rings. The cursor should be an electric cyan block for a "terminal" feel.
- **Progress Indicators:** Use thin, neon-glow lines rather than thick blocks.
- **Interactive Graphs:** Use "Area" charts with gradient fills that fade into the background, maintaining the transparent, layered theme.
