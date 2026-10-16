import { Link } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Example from "../../../packages/ui/src/components/gl-transitions/Example";
export default function TransitionsScreen() {
  const inset = useSafeAreaInsets();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#f3f6ee",
        paddingTop: inset.top + 24,
        paddingBottom: inset.bottom + 16,
      }}
    >
      <Link href="/" style={{ marginHorizontal: 24, color: "#31513b" }}>
        ← All components
      </Link>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Example onSnap={() => void Haptics.selectionAsync().catch(() => {})} />
      </View>
      <Text style={{ padding: 24, color: "#637e6b", fontSize: 12 }}>
        A gallery that streaks with your swipe, blur growing with speed. Pages are prepared textures;
        native capture and physical-device performance are unverified.
      </Text>
    </View>
  );
}
