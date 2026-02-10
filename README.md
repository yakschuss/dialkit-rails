# DialKit for Rails

A Rails port of [Josh Puckett's DialKit](https://www.npmjs.com/package/dialkit) for React. Live CSS tuning panel — add sliders, toggles, and controls to any element and adjust values in real-time without page reloads.

Development-only. Zero config. No JS build changes.

## Install

```ruby
# Gemfile
gem "dialkit-rails", group: :development
```

That's it. The engine auto-injects its own JS and CSS via middleware. No initializer, no imports, no asset pipeline changes needed.

## Usage

Add `dial_kit(...)` to any element in your ERB, then reference the values with CSS custom properties:

```erb
<div class="card"
     style="border-radius: calc(var(--dk-radius, 8) * 1px);
            opacity: var(--dk-opacity, 1);"
     <%= dial_kit("Card", radius: [8, 0, 24], opacity: [1, 0, 1]) %>>
  Card content
</div>
```

Press **Ctrl+Shift+D** (or click the gear icon) to open the panel.

### How it works

1. `dial_kit(...)` helper renders `data-dial-kit` attributes on the element
2. The JS finds those elements and builds a floating panel with controls
3. Moving a slider calls `element.style.setProperty('--dk-radius', value)`
4. Your CSS picks it up via `var(--dk-radius)` at 60fps

### Controlling multiple elements

CSS custom properties cascade. Put `dial_kit()` on a **parent** and all children inherit the values:

```erb
<%# One panel section controls all cards %>
<div class="grid"
     style="gap: calc(var(--dk-gap, 24) * 1px);"
     <%= dial_kit("Layout", gap: [24, 0, 64], card_padding: [16, 4, 48]) %>>

  <% cards.each do |card| %>
    <%# Each card reads from the parent's custom properties %>
    <div style="padding: calc(var(--dk-card_padding, 16) * 1px);">
      <%= card.name %>
    </div>
  <% end %>
</div>
```

## Control Types

### Slider

```erb
<%= dial_kit(blur: [16, 0, 100]) %>           <%# [default, min, max] %>
<%= dial_kit(opacity: [1, 0, 1, 0.01]) %>     <%# [default, min, max, step] %>
<%= dial_kit(scale: 1.5) %>                    <%# bare number, range auto-inferred %>
```

### Toggle

```erb
<%= dial_kit(visible: true) %>
```

Sets `--dk-visible` to `1` or `0`.

### Color Picker

```erb
<%= dial_kit(accent: "#3b82f6") %>
```

Sets `--dk-accent` to a hex color string.

### Select Dropdown

```erb
<%= dial_kit(theme: { type: :select, options: %w[light dark auto], default: "light" }) %>
```

### Text Input

```erb
<%= dial_kit(label: "Click me") %>
```

### Action Button

```erb
<%= dial_kit(reset: { type: :action }) %>
```

Dispatches a `dial-kit:action` CustomEvent on the element:

```js
element.addEventListener('dial-kit:action', (e) => {
  if (e.detail.action === 'reset') { /* ... */ }
})
```

### Grouped Controls

Nested hashes render as collapsible folders in the panel:

```erb
<%= dial_kit(shadow: { y: [8, 0, 24], blur: [16, 0, 48], opacity: [0.2, 0, 1, 0.01] }) %>
```

## Named Sections

Pass a string as the first argument to name the panel section:

```erb
<%= dial_kit("Hero Card", blur: [16, 0, 100]) %>
```

Without a name, DialKit infers one from the element's `id` or first CSS class.

## Configuration

Optional. Defaults work out of the box.

```ruby
# config/initializers/dial_kit.rb
DialKit.configure do |config|
  config.position = "middle-right"      # top-right, top-left, bottom-right, bottom-left, middle-right
  config.keyboard_shortcut = "ctrl+shift+d"
  config.z_index = 99999
  config.enabled = true                 # auto-disabled outside development/test regardless
end
```

## Copy Button

Click the clipboard icon in the panel header to copy current values. The output is agent-friendly — ERB helper calls and CSS custom property declarations you can paste directly into a prompt or code.

## Panel Features

- **Dark theme** panel, non-intrusive
- **Draggable** by the header
- **Collapsible** sections per element
- **Highlight ring** on target element when hovering its section
- **Turbo-compatible** via MutationObserver (detects dynamically added elements)
- **Keyboard shortcut** to toggle (default: Ctrl+Shift+D)

## CSS Custom Property Reference

Every control sets a property named `--dk-<key>` on its target element. Use `calc(var(--dk-key, fallback) * 1px)` for pixel values, or `var(--dk-key, fallback)` for unitless/string values.

| Control | Property | Value |
|---------|----------|-------|
| Slider | `--dk-<key>` | Number |
| Toggle | `--dk-<key>` | `1` or `0` |
| Color | `--dk-<key>` | Hex string |
| Select | `--dk-<key>` | Selected option string |
| Text | `--dk-<key>` | Input string |

## Requirements

- Ruby >= 3.0
- Rails >= 7.0
