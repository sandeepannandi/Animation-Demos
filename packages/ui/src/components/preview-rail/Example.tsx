// Nativelet Preview Rail. MIT: retain the accompanying LICENSE.
import { useState } from 'react';
import { PreviewRail } from './PreviewRail';
const items = [
  { id: 'focus', label: 'Focus', description: 'Make room for one thing at a time.' },
  { id: 'listen', label: 'Listen', description: 'Find a little space in your day.' },
  { id: 'move', label: 'Move', description: 'Step outside. Start again.' },
];
export default function Example() {
  const [activeId, setActiveId] = useState('focus');
  return <PreviewRail items={items} activeId={activeId} onActiveChange={setActiveId} />;
}
