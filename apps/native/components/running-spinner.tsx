import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type Size = "small" | "large";
type Props = { size?: Size; color?: string };

const CONFIGS: Record<
  Size,
  {
    outer: number;
    armLen: number;
    armH: number;
    radius: number;
    duration: number;
  }
> = {
  small: { outer: 20, armLen: 7, armH: 2, radius: 6, duration: 800 },
  large: { outer: 56, armLen: 18, armH: 3, radius: 18, duration: 1000 },
};

const ARM_ANGLES = [
  { angle: 0, opacity: 1.0 },
  { angle: 120, opacity: 0.5 },
  { angle: 240, opacity: 0.2 },
] as const;

export function RunningSpinner({ size = "small", color = "#f97316" }: Props) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withRepeat(
      withTiming(360, {
        duration: CONFIGS[size].duration,
        easing: Easing.linear,
      }),
      -1,
      false
    );
  }, [rotation, size]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const cfg = CONFIGS[size];
  const cx = cfg.outer / 2;
  const cy = cfg.outer / 2;

  return (
    <View
      style={{
        width: cfg.outer,
        height: cfg.outer,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {size === "large" && (
        <Text
          style={{
            position: "absolute",
            color,
            fontSize: 12,
            fontWeight: "900",
            fontStyle: "italic",
            letterSpacing: -0.5,
          }}
        >
          go
        </Text>
      )}

      <Animated.View
        style={[
          { position: "absolute", width: cfg.outer, height: cfg.outer },
          animatedStyle,
        ]}
      >
        {ARM_ANGLES.map(({ angle, opacity }) => {
          const rad = (angle * Math.PI) / 180;
          const ax = cx + cfg.radius * Math.sin(rad) - cfg.armLen / 2;
          const ay = cy - cfg.radius * Math.cos(rad) - cfg.armH / 2;
          return (
            <View
              key={angle}
              style={{
                position: "absolute",
                left: ax,
                top: ay,
                width: cfg.armLen,
                height: cfg.armH,
                borderRadius: cfg.armH / 2,
                backgroundColor: color,
                opacity,
                transform: [{ rotate: `${angle}deg` }],
              }}
            />
          );
        })}
      </Animated.View>
    </View>
  );
}
