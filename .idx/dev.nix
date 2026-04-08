{ pkgs, ... }: {
  channel = "stable-24.05";
  packages = [
    pkgs.nodejs_20
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
      onStart = {
        # Optional: You can put start commands here
      };
    };
  };
}
