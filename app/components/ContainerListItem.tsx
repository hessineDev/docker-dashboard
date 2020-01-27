import * as React from "react";
import * as classNames from "classnames";
import * as io from "socket.io-client";
import { useMappedState } from "react-use-mapped-state";

const socket = io.connect();

interface Mount {
  Type: string;
  Source: string;
  Destination: string;
  Mode: string;
  RW: boolean;
  Propagation: string;
}

interface Port {
  IP?: string;
  PrivatePort?: number;
  PublicPort?: number;
  Type: string;
}

export interface Container {
  id: string;
  name: string;
  image: string;
  state: string;
  status: string;
  ports: Array<Port>;
  volumes: Array<string>;
  mounts: Array<Mount>;
  command: string;
}

interface IContainerListItemInitialState {
  logStreams: Array<string>;
  isStreaming: boolean;
}

const ContainerListItemInitialState: IContainerListItemInitialState = {
  logStreams: [],
  isStreaming: false
};

export const ContainerListItem: React.FC<Container> = ({
  id,
  name,
  image,
  state,
  status,
  ports,
  volumes,
  mounts,
  command
}) => {
  const [{ logStreams, isStreaming }, valueSetter] = useMappedState(
    ContainerListItemInitialState
  );

  const logRef: React.RefObject<HTMLDivElement> = React.createRef();
  const isRunning = state === "running";

  const onActionButtonClick = () => {
    const evt = isRunning ? "container.stop" : "container.start";
    socket.emit(evt, { id });
  };

  const onPipeLogs = () => {
    socket.emit("container.pipe_logs", { id });
    valueSetter("isStreaming", true);
  };

  const onStopPipeLogs = () => {
    socket.emit("container.stop_pipe_logs", { id });
    valueSetter("isStreaming", false);
  };

  const updateLogScroll = () => {
    if (logRef.current !== null)
      logRef.current.scrollTop = logRef.current.scrollHeight;
  };

  const onRemoveContainer = () => {
    socket.emit("container.remove", { id });
  };

  const panelClass = isRunning ? "success" : "default";
  const classes = classNames("panel", `panel-${panelClass}`);
  const buttonText = isRunning ? "Stop" : "Start";

  React.useEffect(() => {
    socket.on(
      "container.return_piped_logs",
      (logStreams: { results: Array<string> }, err: any) => {
        if (err) throw err;
        if (logStreams.results) {
          valueSetter("logStreams", logStreams.results);
        }
      }
    );

    socket.on("container.removed_success", (data: any, err: any) => {
      //clear circular check;
      console.log(data, err);
    });

    socket.on("container.removed_fail", (data: any, err: any) => {
      //clear circular check;
      console.log(data, err);
    });
  }, []);

  const logStyles = {
    overflow: "scroll",
    height: "300px"
  };

  React.useEffect(() => {
    updateLogScroll();
  }, [logStreams]);

  return (
    <>
      <div className="col-sm-12">
        <div className={classes}>
          <div className="panel-heading">{name}</div>
          <div className="panel-body">
            Id: {id}
            <br />
            Status: {status}
            <br />
            Image: {image}
            <br />
            Volumes: <span>{volumes.join(", ")}</span>
            <br />
            Mounts:{" "}
            {mounts.map(
              ({ Type, Source, Destination, Mode, RW, Propagation }) => (
                <>
                  <p>Type: {Type}</p>
                  <p>Source: {Source}</p>
                  <p>Destination: {Destination}</p>
                  <p>Mode: {Mode}</p>
                  <p>RW: {RW}</p>
                  <p>Propagation: {Propagation}</p>
                </>
              )
            )}
            <br />
            Ports:{" "}
            {ports.map((portObj: Port) => {
              return Object.keys(portObj).map((portData: keyof Port) => {
                return <span style={{ margin: "3px" }}>{portData}</span>;
              });
            })}
            <br />
            Command: <span>{command}</span>
          </div>
          <div className="panel-footer">
            <button onClick={onActionButtonClick} className="btn btn-default">
              {buttonText}
            </button>
            {!isStreaming && (
              <button onClick={onPipeLogs} className="btn btn-default">
                Start Streaming Logs
              </button>
            )}

            {isStreaming && (
              <button onClick={onStopPipeLogs} className="btn btn-default">
                Stop Streaming Logs
              </button>
            )}
            <button onClick={onRemoveContainer} className="btn btn-default">
              Remove
            </button>
          </div>
        </div>
      </div>
      {isStreaming && (
        <div className="col-sm-12">
          <div className="panel-heading">Logs</div>
          <div ref={logRef} style={logStyles} className="panel-body">
            {logStreams.map((log: string, index: number) => {
              return <p key={index}>{log}</p>;
            })}
          </div>
        </div>
      )}
    </>
  );
};
