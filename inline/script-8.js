
window.addEventListener("DOMContentLoaded", (event) => {
  setTimeout(() => {
    $(".plyr_component").each(function (index) {
      let thisComponent = $(this);

      // Create plyr settings
      let player = new Plyr(thisComponent.find(".plyr_video")[0], {
        controls: ["play", "progress", "current-time", "mute", "fullscreen"],
        resetOnEnd: true,
        youtube: {
          noCookie: true,
        }
      });

      // Set the default quality after player initialization
      player.on('ready', () => {
        player.media.setQuality('hd1080'); // Set default quality (use 'hd1080', 'hd720', etc.)
      });

      // Custom video cover
      thisComponent.find(".plyr_cover").on("click", function () {
        player.play();
      });

      player.on("ended", (event) => {
        thisComponent.removeClass("hide-cover");
      });

      // Pause other playing videos when this one starts playing
      player.on("play", (event) => {
        $(".plyr_component").removeClass("hide-cover");
        thisComponent.addClass("hide-cover");
        let prevPlayingComponent = $(".plyr--playing").closest(".plyr_component").not(thisComponent);
        if (prevPlayingComponent.length > 0) {
          prevPlayingComponent.find(".plyr_pause-trigger")[0].click();
        }
      });

      thisComponent.find(".plyr_pause-trigger").on("click", function () {
        player.pause();
      });

      // Exit full screen when video ends
      player.on("ended", (event) => {
        if (player.fullscreen.active) {
          player.fullscreen.exit();
        }
      });

      // Set video to contain instead of cover when in full screen mode
      player.on("enterfullscreen", (event) => {
        thisComponent.addClass("contain-video");
      });

      player.on("exitfullscreen", (event) => {
        thisComponent.removeClass("contain-video");
      });
    });
  }, 1000); // 1 second delay
});
