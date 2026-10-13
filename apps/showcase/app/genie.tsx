import { Link } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Example from "../../../packages/ui/src/components/genie-dismiss/Example";
export default function GenieScreen() {
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
      <Link href="/morph" style={{ marginHorizontal: 24, color: "#31513b" }}>
        ← Text Morph
      </Link>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Example />
      </View>
      <Text style={{ padding: 24, color: "#637e6b", fontSize: 12 }}>
        A textured card that funnels into a target. Native view capture and
        physical-device performance are unverified.
      </Text>
    </View>
  );
}
