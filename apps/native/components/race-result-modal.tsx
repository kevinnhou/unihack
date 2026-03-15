import { Modal, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  eloChange: number | null;
  isWin: boolean | null;
  onClose: () => void;
};

export function RaceResultModal({ visible, eloChange, isWin, onClose }: Props) {
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  const change = eloChange ?? 0;
  const absChange = Math.abs(change);

  const titleClass = isWin ? "text-green-400" : "text-red-400";
  const messageClass = isWin ? "text-green-200" : "text-red-200";

  return (
    <Modal animationType="slide" presentationStyle="fullScreen" visible={visible}>
      <View className="flex-1 justify-end bg-black" style={{ paddingBottom: insets.bottom }}>
        <View className="flex-1 justify-center px-6">
          <Text className={`mb-4 text-center font-black text-2xl ${titleClass}`}>
            {isWin ? "You Won!" : "You Lost"}
          </Text>

          <Text className={`mb-8 text-center text-base ${messageClass}`}>
            {isWin
              ? `You beat the ghost and gained ${absChange} ELO.`
              : `You lost to the ghost and lost ${absChange} ELO.`}
          </Text>

          <TouchableOpacity className="mb-4 items-center rounded-2xl bg-orange-500 py-4" onPress={onClose}>
            <Text className="font-bold text-lg text-white">Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
