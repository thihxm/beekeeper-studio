import { describe, it, expect } from 'vitest'
import { createMenuItem } from '@/lib/menu/tableMenu'

// Tabulator sets this string as the innerHTML of .tabulator-menu-item, so the
// markup here is exactly what the context menu renders.
describe('createMenuItem', () => {
  it('wraps a plain label', () => {
    expect(createMenuItem('Add row')).toBe('<x-menuitem><x-label>Add row</x-label></x-menuitem>')
  })

  it('adds a shortcut, taking the first of a list', () => {
    expect(createMenuItem('Paste', 'Control+V')).toContain('<x-shortcut value="Control+V" />')
    expect(createMenuItem('Paste', ['Control+V', 'Meta+V'])).toContain('<x-shortcut value="Control+V" />')
  })

  it('puts the icon on the leading edge, before the label', () => {
    const html = createMenuItem('View as JSON', '', { icon: 'data_object' })
    expect(html).toBe(
      '<x-menuitem><i class="material-icons leading-icon">data_object</i><x-label>View as JSON</x-label></x-menuitem>'
    )
  })

  it('keeps the shortcut after the label when there is a leading icon', () => {
    const html = createMenuItem('View as JSON', 'Control+J', { icon: 'data_object' })
    expect(html.indexOf('leading-icon')).toBeLessThan(html.indexOf('<x-label>'))
    expect(html.indexOf('<x-label>')).toBeLessThan(html.indexOf('<x-shortcut'))
  })

  it('escapes everything it interpolates', () => {
    const html = createMenuItem('<script>x</script>', '"><b>', { icon: '"><b>' })
    expect(html).not.toContain('<script>')
    expect(html).not.toContain('<b>')
    expect(html).toContain('&lt;script&gt;')
  })
})
