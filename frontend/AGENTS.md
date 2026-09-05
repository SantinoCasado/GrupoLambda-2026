# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Reusable components

### ChineseFrame ("Chinese border")
`src/components/ChineseFrame.tsx` — a reusable traditional Chinese border: a double-line frame with huiwen (回纹) meander corners, drawn in terracota (`#c32f27`) via `react-native-svg`. It self-fits its content by measuring with `onLayout` and applying internal gutter padding.

Usage:
```tsx
import { ChineseFrame } from "./src/components/ChineseFrame";

<ChineseFrame className="mt-2 rounded-2xl bg-vino" color="#c32f27">
  ...content...
</ChineseFrame>
```
- `className`: layout/background styling passed to the wrapper View.
- `color`: border stroke color (defaults to terracota `#c32f27`).
- Requires `react-native-svg` installed.

Reuse this component (by copying the file + installing `react-native-svg`) whenever a project needs an East-Asian ornamental double border with corner knots.

