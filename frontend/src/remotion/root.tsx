import { Composition } from "remotion";
import { PromoVideo } from "./promo-video";
import "./style.css";

export const RemotionRoot = () => {
  return (
    <Composition
      id="ProwasappPromo"
      component={PromoVideo}
      durationInFrames={1350}
      fps={30}
      width={1080}
      height={1920}
      defaultProps={{}}
    />
  );
};
