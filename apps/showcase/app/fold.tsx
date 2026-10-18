import { Link } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Example from "../../../packages/ui/src/components/folded-pass/Example";
export default function FoldScreen() {
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
        <Example />
      </View>
      <Text style={{ padding: 24, color: "#637e6b", fontSize: 12 }}>
        A paper pass that unfolds under your finger. Frozen paper while it moves; native capture and
        physical-device performance are unverified.
      </Text>
    </View>
  );
}
