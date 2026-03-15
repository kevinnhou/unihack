import { Modal, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RunningSpinner } from "./running-spinner";

type Props = {
  visible: boolean;
  displayName: string;
  elo: number;
  distance: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function GhostAlertModal({
  visible,
  displayName,
  elo,
  distance,
  loading = false,
  onConfirm,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      onRequestClose={onCancel}
      presentationStyle="fullScreen"
      visible={visible}
    >
      <View
        className="flex-1 justify-end bg-black"
        style={{ paddingBottom: insets.bottom }}
      >
        <View className="flex-1 justify-center px-6">
          <Text className="mb-2 text-center font-black text-2xl text-white">
            Ghost Race Confirmation
          </Text>
          <Text className="mb-8 text-center text-base text-gray-400">
            You will be racing against {displayName}'s ghost. ELO {elo}.
            Distance: {distance}.
          </Text>

          <TouchableOpacity
            className="mb-4 items-center rounded-2xl bg-orange-500 py-4"
            disabled={loading}
            onPress={onConfirm}
          >
            {loading ? (
              <RunningSpinner color="white" size="small" />
            ) : (
              <Text className="font-bold text-lg text-white">Let's go!</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            className="items-center rounded-2xl border border-neutral-600 py-4"
            disabled={loading}
            onPress={onCancel}
          >
            <Text className="font-semibold text-gray-400">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
