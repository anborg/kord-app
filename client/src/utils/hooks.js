import { useAlert } from "react-alert";
import { useDispatch, useSelector } from "react-redux";
import { useHistory, useLocation } from "react-router-dom";
import { useRef, useEffect, useState } from "react";
import Cookies from "js-cookie";
import raf from "raf";

import {
  capitalizeWord,
  formatArtistName,
  getTitleFromPathname
} from "./formattingHelpers";
import { fetchGeneric } from "./fetchGeneric";
import {
  fetchProfileAndPlaylists,
  fetchUserProfiles,
  setAccessToken,
  setConnection,
  setKordId,
  setMainConnection
} from "../redux/actions/userActions";
import { fetchUserPlaylists } from "../redux/actions/libraryActions";
import {
  nextTrack,
  pause,
  play,
  prevTrack,
  setDuration,
  setSeek
} from "../redux/actions/playerActions";

export function useLoadUserDataOnMount(setIsLoadingUserData) {
  const mainConnection = useSelector(state => state.user.kord.mainConnection);
  const dispatch = useDispatch();
  const history = useHistory();
  const alert = useAlert();

  useEffect(() => {
    window.addEventListener("beforeunload", setCookieOnUnload);
    return () => {
      window.removeEventListener("beforeunload", setCookieOnUnload);
    };
  }, []);

  const setCookieOnUnload = e => {
    Cookies.set("userBackUnderOneHour", "true", {
      expires: 1 / 24
    });
  };

  useEffect(() => {
    const userBackUnderOneHour = Cookies.get("userBackUnderOneHour");
    if (window.location.hash || !userBackUnderOneHour) {
      setIsLoadingUserData(true);

      dispatch(refreshUserData(alert))
        .then(() => dispatch(handleHashParams(history, mainConnection)))
        .finally(() => setTimeout(() => setIsLoadingUserData(false), 600));
    } else {
      setIsLoadingUserData(false);
    } // eslint-disable-next-line
  }, []);
}

const refreshUserData = alert => dispatch => {
  const userBackUnderOneHour = Cookies.get("userBackUnderOneHour");

  if (!userBackUnderOneHour) {
    return Promise.all([
      dispatch(fetchUserProfiles()).catch(e =>
        alert.error("Unable to restore profiles")
      ),
      dispatch(fetchUserPlaylists()).catch(e =>
        alert.error("Unable to restore playlists")
      )
    ]);
  }

  return Promise.resolve();
};

const handleHashParams = (history, mainConnection) => dispatch => {
  if (window.location.hash) {
    // Get hash params excluding first #
    const URLParams = new URLSearchParams(window.location.hash.substr(1));
    const accessToken = URLParams.get("accessToken");
    const source = URLParams.get("source");
    const userId = URLParams.get("userId");

    if (userId) {
      dispatch(setKordId(userId));
    }

    if (source) {
      if (accessToken) {
        dispatch(setAccessToken(source, accessToken));
        dispatch(setConnection(source, true));
      }

      if (!mainConnection) {
        dispatch(setMainConnection(source));
      }

      return dispatch(fetchProfileAndPlaylists(source))
        .catch(e => alert.error("Connect account failed"))
        .finally(() => history.push(window.location.pathname));
    }
  }

  return Promise.resolve();
};

export function useMobileDetection() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 800);
  function handleResize() {
    setIsMobile(window.innerWidth < 800);
  }

  useEffect(() => {
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return isMobile;
}

export function usePrevious(value) {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
}

export function useSetDurationOnTrackChange(current) {
  const dispatch = useDispatch();
  useEffect(() => {
    dispatch(setSeek(0));
    dispatch(setDuration(Math.round(current.duration / 1000)));
  }, [current, dispatch]); // Song was changed
}

export function usePauseIfSdkNotReady(current, isPlaying, isSpotifySdkReady) {
  const dispatch = useDispatch();

  useEffect(() => {
    // Prevent play if player is not ready
    if (current.source === "spotify") {
      if (isPlaying && !isSpotifySdkReady) {
        dispatch(pause());
      }
    }
  }, [isPlaying, current, isSpotifySdkReady, dispatch]);
}

export function useRenderSeekPosition(
  current,
  theRaf,
  renderSeekPos,
  isPlaying
) {
  useEffect(() => {
    raf.cancel(theRaf.current);

    if (isPlaying) {
      renderSeekPos();
    } else raf.cancel(theRaf.current);

    return () => raf.cancel(theRaf);
  }, [current, isPlaying, theRaf, renderSeekPos]); // Stop or start RAF when play/pause and song changes
}

export function useDetectMediaSession() {
  const dispatch = useDispatch();

  function handleNext() {
    dispatch(nextTrack());
  }

  function handlePause() {
    dispatch(pause());
  }

  function handlePlay() {
    dispatch(play());
  }

  function handlePrev() {
    dispatch(prevTrack());
  }

  useEffect(() => {
    const { mediaSession } = navigator;

    const events = {
      nexttrack: handleNext,
      pause: handlePause,
      play: handlePlay,
      previoustrack: handlePrev
    };

    if (mediaSession) {
      for (let evt of Object.keys(events)) {
        navigator.mediaSession.setActionHandler(evt, events[evt]);
      }
    }
    return () => {
      if (mediaSession) {
        for (let evt of Object.keys(events)) {
          navigator.mediaSession.setActionHandler(evt, null);
        }
      }
    }; //eslint-disable-next-line
  }, []);
}

export function useKeepSessionAlive() {
  const timer = useRef(null);

  function refreshUserCookie() {
    fetchGeneric("/auth/token").catch(e => {
      if (e.status === 403 || e.status === 401) {
        window.location = "/login";
      }
    });
  }

  function clearInterval() {
    clearTimeout(timer.current);
  }

  useEffect(() => {
    const oneHour = 1000 * 60 * 60;
    timer.current = setInterval(refreshUserCookie, oneHour);

    return clearInterval;
  }, []);
}

const keysPressed = {};

export function useKeyControls(handleKeyControls) {
  const controlList = [
    " ",
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "f",
    "m",
    "q",
    "h",
    "Shift"
  ];

  useEffect(() => {
    window.onkeydown = e => {
      const { key } = e;

      if (controlList.includes(key)) {
        e.preventDefault();
      }

      if (keysPressed[key] && key !== "Shift") {
        // Prevent holding down key rapid fire
        return;
      }

      keysPressed[key] = true;

      handleKeyControls(key, keysPressed["Shift"]);
    };

    window.onkeyup = e => {
      delete keysPressed[e.key];
    };
  }, [controlList, handleKeyControls]);
}

export function useSetDocumentTitle() {
  const { pathname } = useLocation();
  const isPlaying = useSelector(state => state.player.isPlaying);
  const currentTrack = useSelector(state => state.player.currentTrack);
  const currentPage = getTitleFromPathname(pathname);

  useEffect(() => {
    if (isPlaying) {
      document.title = `${currentTrack.title} ◦ ${formatArtistName(
        currentTrack.artist
      )}`;
    } else {
      document.title = `Kord | ${capitalizeWord(currentPage)}`;
    }
  }, [currentPage, currentTrack, isPlaying]);
}

export function useClearSessionStorageOnRefresh() {
  useEffect(() => {
    window.onbeforeunload = function(e) {
      sessionStorage.clear();

      e.preventDefault();
    };
  }, []);
}
