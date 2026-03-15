import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

interface AgonLogoProps {
  size?: "sm" | "md" | "lg" | "xl";
  showTagline?: boolean;
  animateOnMount?: boolean;
}

const SIZES = {
  sm: { font: 28, tagline: 10, taglineSpacing: 1.5, divider: 24 },
  md: { font: 40, tagline: 12, taglineSpacing: 2, divider: 32 },
  lg: { font: 56, tagline: 14, taglineSpacing: 2.5, divider: 40 },
  xl: { font: 72, tagline: 15, taglineSpacing: 3, divider: 48 },
};

export function AgonLogo({
  size = "xl",
  showTagline = false,
  animateOnMount = true,
}: AgonLogoProps) {
  const { font, tagline, taglineSpacing, divider } = SIZES[size];

  // "go" slides in from the right (running motion)
  const goTranslateX = useSharedValue(animateOnMount ? 60 : 0);
  const goOpacity = useSharedValue(animateOnMount ? 0 : 1);

  // Speed-line shimmer that sweeps right → left under "go"
  const shimmerX = useSharedValue(0);

  // "a" and "n" fade in
  const flanksOpacity = useSharedValue(animateOnMount ? 0 : 1);

  useEffect(() => {
    if (!animateOnMount) return;

    // "go" rockets in
    goTranslateX.value = withDelay(
      120,
      withSpring(0, { damping: 14, stiffness: 180 })
    );
    goOpacity.value = withDelay(100, withTiming(1, { duration: 200 }));

    // flanking letters fade in slightly after
    flanksOpacity.value = withDelay(80, withTiming(1, { duration: 300 }));

    // looping shimmer after entrance
    shimmerX.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 600, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 0 })
        ),
        -1,
        false
      )
    );
  }, [animateOnMount, flanksOpacity, goOpacity, goTranslateX, shimmerX]);

  const goStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: goTranslateX.value }],
    opacity: goOpacity.value,
  }));

  const flanksStyle = useAnimatedStyle(() => ({
    opacity: flanksOpacity.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => {
    const width = interpolate(shimmerX.value, [0, 0.3, 0.7, 1], [0, 1, 1, 0]);
    const left = interpolate(shimmerX.value, [0, 1], [0, 1]);
    return {
      width: `${width * 100}%` as `${number}%`,
      left: `${left * 0}%` as `${number}%`,
      opacity: interpolate(shimmerX.value, [0, 0.1, 0.9, 1], [0, 0.7, 0.7, 0]),
    };
  });

  return (
    <View style={{ alignItems: "center" }}>
      <View style={{ flexDirection: "row", alignItems: "baseline" }}>
        {/* "a" */}
        <Animated.Text
          style={[
            flanksStyle,
            {
              color: "#ffffff",
              fontSize: font,
              fontWeight: "900",
              letterSpacing: -2,
              lineHeight: font * 1.1,
            },
          ]}
        >
          a
        </Animated.Text>

        {/* "go" — the logo mark */}
        <View style={{ position: "relative" }}>
          <Animated.Text
            style={[
              goStyle,
              {
                color: "#f97316",
                fontSize: font,
                fontWeight: "900",
                fontStyle: "italic",
                letterSpacing: -2,
                lineHeight: font * 1.1,
              },
            ]}
          >
            go
          </Animated.Text>

          {/* speed-line under "go" */}
          <Animated.View
            style={[
              shimmerStyle,
              {
                position: "absolute",
                bottom: 2,
                height: 2,
                backgroundColor: "#f97316",
                borderRadius: 1,
              },
            ]}
          />
        </View>

        {/* "n" */}
        <Animated.Text
          style={[
            flanksStyle,
            {
              color: "#ffffff",
              fontSize: font,
              fontWeight: "900",
              letterSpacing: -2,
              lineHeight: font * 1.1,
            },
          ]}
        >
          n
        </Animated.Text>
      </View>

      {showTagline && (
        <Animated.View
          entering={FadeIn.delay(600).duration(400)}
          style={{ alignItems: "center", marginTop: 4 }}
        >
          <View
            style={{
              height: 2,
              width: divider,
              backgroundColor: "#f97316",
              borderRadius: 1,
              marginBottom: 8,
            }}
          />
          <Text
            style={{
              color: "#f97316",
              fontSize: tagline,
              fontWeight: "600",
              letterSpacing: taglineSpacing,
              textTransform: "uppercase",
            }}
          >
            Compete. Dominate. Run.
          </Text>
        </Animated.View>
      )}
    </View>
  );
}
