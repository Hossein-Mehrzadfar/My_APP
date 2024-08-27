"use client";

import {
  ControlBar,
  GridLayout,
  LiveKitRoom,
  ParticipantTile,
  RoomAudioRenderer,
  useTracks,
} from "@livekit/components-react";
import "@livekit/components-styles";
import { Track, TrackPublication } from "livekit-client";
import { useEffect, useState } from "react";

export default function Page() {
  const [token, setToken] = useState("");
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const iD = Math.floor(Math.random() * 100);

  useEffect(() => {
    (async () => {
      try {
        const resp = await fetch(
          `/api/get-participant-token?room=room&username=${iD}`
        );
        const data = await resp.json();
        setToken(data.token);
      } catch (e) {
        console.error(e);
      }
    })();

    // Establish WebSocket connection to the transcription service
    const ws = new WebSocket("wss://api.rev.ai/speechtotext/v1/stream?access_token=<02593g2xwbXh09rpt3HATZRI0B4XoOg35eDaZBy0VUWsJUo1tRvYtpB27tYEdST9wOTHyZahRfFbIdMiFVDbbjga71TNA>&content_type=audio/x-raw;layout=interleaved;rate=16000;format=S16LE;channels=1&metadata=<METADATA>");
    ws.onopen = () => {
      console.log("WebSocket connection established with transcription service");
    };
    ws.onclose = () => {
      console.log("WebSocket connection to transcription service closed");
    };
    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  if (token === "") {
    return <div>Getting token...</div>;
  }

  return (
    <LiveKitRoom
      video={true}
      audio={true}
      token={token}
      serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
      data-lk-theme="default"
      style={{ height: '100dvh' }}
    >
      <MyVideoConference socket={socket} />
      <RoomAudioRenderer />
      <ControlBar />
    </LiveKitRoom>
  );
}

function MyVideoConference({ socket }: { socket: WebSocket | null }) {
  const tracks = useTracks(
    [
      { source: Track.Source.Microphone, withPlaceholder: true },
    ],
    { onlySubscribed: true },
  );

  useEffect(() => {
    if (socket && tracks) {
      tracks.forEach(trackReference => {
        const trackPub = trackReference.publication as TrackPublication | undefined;
        if (trackPub && trackPub.track && trackPub.track.kind === "audio") {
          const audioTrack = trackPub.track.mediaStreamTrack;

          // Create a MediaStream from the audio track
          const audioStream = new MediaStream([audioTrack]);

          // Use MediaRecorder to capture audio data
          const recorder = new MediaRecorder(audioStream);
          recorder.ondataavailable = (event) => {
            if (socket.readyState === WebSocket.OPEN) {
              socket.send(event.data);
            }
          };
          recorder.start(100); // Record in chunks of 100ms
        }
      });
    }
  }, [socket, tracks]);

  return (
    <GridLayout tracks={tracks} style={{ height: 'calc(100vh - var(--lk-control-bar-height))' }}>
      <ParticipantTile />
    </GridLayout>
  );
}
