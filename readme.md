1. to make text gradient

```css
    background: linear-gradient(to right, rgb(20, 27, 27) 0%, #000000 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
```

2. when using `js` (pure or `jquery`) to add html content to existed html file (__dynamic content__), if using `jquery`, use `on` function rather than `event` functions (`click`, `hover`) as those direct funcs will only handle non-dynamical objects (already created at the time begin reading `js` files) but `on` would allow working with dynamically created ones.