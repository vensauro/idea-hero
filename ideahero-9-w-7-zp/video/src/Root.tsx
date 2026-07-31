import {Composition} from "remotion";
import {IdeaHeroTutorial} from "./IdeaHeroTutorial";

export const FPS = 30;
export const DURATION_IN_FRAMES = 75 * FPS;

export const VideoRoot = () => (
  <Composition
    id="IdeaHeroTutorial"
    component={IdeaHeroTutorial}
    durationInFrames={DURATION_IN_FRAMES}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
