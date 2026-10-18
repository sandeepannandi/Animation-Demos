// Nativelet Morph Capsule. MIT: retain the accompanying LICENSE.
import { useState } from 'react';
import { Text, View } from 'react-native';
import { MorphCapsule, type CapsuleState } from './MorphCapsule';

const label = { color: '#ffffff', fontSize: 13, fontWeight: '600' } as const;
const center = { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 } as const;
const content = {
  idle: <View style={center}><Text style={label}>Ready</Text></View>,
  compact: <View style={center}><Text style={label}>Focus session · 24:10</Text></View>,
  expanded: (
    <View style={center}>
      <Text style={{ ...label, fontSize: 28 }}>24:10</Text>
      <Text style={{ ...label, opacity: 0.7 }}>Focus session. Tap or drag to collapse.</Text>
    </View>
  ),
};
export default function Example() {
  const [state, setState] = useState<CapsuleState>('idle');
  return <MorphCapsule state={state} onStateChange={setState} content={content} accessibilityLabel="Focus session" />;
}
