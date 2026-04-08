{ pkgs, ... }: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_20
    pkgs.python3
    pkgs.yt-dlp
    pkgs.ffmpeg
  ];
  idx = {
    extensions = [
      "ritwickdey.LiveServer"
    ];
    workspace = {
      onCreate = {
        npm-install = "npm install";
      };
    };
  };
}
