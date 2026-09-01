import { cancelPicker, getPickedElement, startPicker } from './picker';

describe('picker', () => {
  afterEach(() => {
    cancelPicker({ forget: true });
    document.body.replaceChildren();
    document.documentElement.style.cursor = '';
  });

  it('resolves as cancelled and removes the overlay', async () => {
    document.body.innerHTML = '<p id="t">hello picker</p>';
    const el = document.getElementById('t')!;
    document.elementsFromPoint = () => [el];
    const pending = startPicker();
    window.dispatchEvent(new MouseEvent('mousemove', { clientX: 8, clientY: 8, bubbles: true }));
    cancelPicker();
    await expect(pending).resolves.toEqual({ ok: false, error: '已取消' });
    expect(document.getElementById('html2md-highlight-host')).toBeNull();
    expect(document.documentElement.style.cursor).toBe('');
  });

  it('confirms the element under the click', async () => {
    document.body.innerHTML = '<section id="t">picked text here</section>';
    const el = document.getElementById('t')!;
    document.elementsFromPoint = () => [el];
    const pending = startPicker();
    window.dispatchEvent(
      new MouseEvent('click', { clientX: 8, clientY: 8, bubbles: true, cancelable: true }),
    );
    await expect(pending).resolves.toMatchObject({ ok: true, tag: 'section' });
    expect(getPickedElement()).toBe(el);
  });

  it('keeps the last confirmed node when a new pick is cancelled', async () => {
    document.body.innerHTML = '<section id="a">aaa</section><div id="b">bbb</div>';
    const a = document.getElementById('a')!;
    const b = document.getElementById('b')!;
    document.elementsFromPoint = () => [a];
    const first = startPicker();
    window.dispatchEvent(
      new MouseEvent('click', { clientX: 8, clientY: 8, bubbles: true, cancelable: true }),
    );
    await first;
    expect(getPickedElement()).toBe(a);

    document.elementsFromPoint = () => [b];
    const second = startPicker();
    cancelPicker();
    await expect(second).resolves.toEqual({ ok: false, error: '已取消' });
    expect(getPickedElement()).toBe(a);
  });

  it('forgets the confirmed node when asked', async () => {
    document.body.innerHTML = '<section id="a">aaa</section>';
    const a = document.getElementById('a')!;
    document.elementsFromPoint = () => [a];
    const pending = startPicker();
    window.dispatchEvent(
      new MouseEvent('click', { clientX: 8, clientY: 8, bubbles: true, cancelable: true }),
    );
    await pending;
    cancelPicker({ forget: true });
    expect(getPickedElement()).toBeNull();
  });
});
