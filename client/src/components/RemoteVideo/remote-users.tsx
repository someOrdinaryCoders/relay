import { memo, useEffect, useState } from "react";
import callJoinTone from "@assets/audio/call-join.mp3";
import callLeftTone from "@assets/audio/call-leave.mp3";
import { RemoteVideo } from "./remote-video";
import { api } from "@services";
import { useRoomContext } from "@utils/hooks/useRoomContext";

export const RemoteUsers = memo(({ screenUid }: { screenUid: string | null }) => {
  const [remoteUsers, setRemoteUsers] = useState<IRemoteUser[]>([]);
  const { client } = useRoomContext();
  const userLeftTone = new Audio(callLeftTone);
  const userJoinedTone = new Audio(callJoinTone);
  userJoinedTone.volume = 0.3;
  userLeftTone.volume = 0.3;

  useEffect(() => {
    client.on("user-joined", async (user) => {
      if (user.uid !== screenUid) {
        const res = await api.getUsername(user.uid as string);
        const username = await res.text();
        setRemoteUsers((prevUsers) => [
          ...prevUsers,
          {
            uid: user.uid,
            username: username,
            remoteAudioTrack: user.audioTrack,
            remoteVideoTrack: user.videoTrack,
          },
        ]);
        await userJoinedTone.play();
      }
    });

    client.on("user-left", async (user) => {
      if (user.uid !== screenUid) {
        setRemoteUsers((prevUsers) => prevUsers.filter((prevUser) => prevUser.uid !== user.uid));
        await api.deleteUsername(user.uid as string);
        await userLeftTone.play();
      }
    });

    client.on("user-published", async (user, mediaType) => {
      if (user.uid !== screenUid) {
        await client.subscribe(user, mediaType);
        if (mediaType === "audio") {
          setRemoteUsers((prevUsers) =>
            prevUsers.map((prevUser) => {
              if (prevUser.uid === user.uid) {
                prevUser.remoteAudioTrack = user.audioTrack;
              }
              return prevUser;
            })
          );
        }
        if (mediaType === "video") {
          setRemoteUsers((prevUsers) =>
            prevUsers.map((prevUser) => {
              if (prevUser.uid === user.uid) {
                prevUser.remoteVideoTrack = user.videoTrack;
              }
              return prevUser;
            })
          );
        }
      }
    });
    client.on("user-unpublished", async (user, mediaType) => {
      if (user.uid !== screenUid) {
        if (mediaType === "audio") {
          setRemoteUsers((prevUsers) =>
            prevUsers.map((prevUser) => {
              if (prevUser.uid === user.uid) {
                delete prevUser.remoteAudioTrack;
              }
              return prevUser;
            })
          );
        }
        if (mediaType === "video") {
          setRemoteUsers((prevUsers) =>
            prevUsers.map((prevUser) => {
              if (prevUser.uid === user.uid) {
                delete prevUser.remoteVideoTrack;
              }
              return prevUser;
            })
          );
        }
      }
    });

    return () => {
      client.removeAllListeners();
    };
  }, []);

  return (
    <>
      {remoteUsers.map((remoteUser) => {
        return (
          <RemoteVideo
            remoteAudioTrack={remoteUser.remoteAudioTrack}
            remoteVideoTrack={remoteUser.remoteVideoTrack}
            username={remoteUser.username}
            key={remoteUser.uid}
          />
        );
      })}
    </>
  );
});