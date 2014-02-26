(function(window) {
  window.TumblrVars = {
    title: "{Title}",
    posts: {
      photos: [
	{block:Posts}{block:Photo} {
	  photoAlt: "{PhotoAlt}",
	  {block:Caption}caption: "{Caption}",{/block:Caption}
	  linkUrl: "{LinkURL}",
	  photoURL500: "{PhotoURL-500}",
	  photoWidth500: "{PhotoWidth-500}",
	  photoHeight500: "{PhotoHeight-500}",
	  photoURL400: "{PhotoURL-400}",
	  photoWidth400: "{PhotoWidth-400}",
	  photoHeight400: "{PhotoHeight-400}",
	  photoURL250: "{PhotoURL-250}",
	  photoWidth250: "{PhotoWidth-250}",
	  photoHeight250: "{PhotoHeight-250}",
	  photoURL100: "{PhotoURL-100}",
	  photoWidth100: "{PhotoWidth-100}",
	  photoHeight100: "{PhotoHeight-100}",
	  photoURL75sq: "{PhotoURL-75sq}"
	 }, {/block:Photo}{/block:Posts}
      ]
    }
  }
})(window);
