(function(window) {
  window.TumblrVars = {
    title: '{Title}',
    blogUrl: '{BlogURL}',
    rss: '{RSS}',
    portraitUrl64: '{PortraitURL-64}',

    posts: {
      photos: [
        {block:Posts}{block:Photo} {
          postType: '{PostType}',
          postId: '{PostID}',
          permalink: '{Permalink}',
          postNotesUrl: '{PostNotesUrl}',

          likeButton: '{LikeButton}',
          reblogButton: '{ReblogButton}',

          photoAlt: '{PhotoAlt}',
          {block:Caption}caption: '{Caption}',{/block:Caption}
          linkUrl: '{LinkURL}',
          photoUrl500: '{PhotoURL-500}',
          photoWidth500: '{PhotoWidth-500}',
          photoHeight500: '{PhotoHeight-500}',
          photoUrl400: '{PhotoURL-400}',
          photoWidth400: '{PhotoWidth-400}',
          photoHeight400: '{PhotoHeight-400}',
          photoUrl250: '{PhotoURL-250}',
          photoWidth250: '{PhotoWidth-250}',
          photoHeight250: '{PhotoHeight-250}',
          photoUrl100: '{PhotoURL-100}',
          photoWidth100: '{PhotoWidth-100}',
          photoHeight100: '{PhotoHeight-100}',
          photoUrl75sq: '{PhotoURL-75sq}',
          {/block:Photo}
	  {block:Date}date: {
	    timestamp: {Timestamp},
	    timeAgo: {TimeAgo}
	  },{/block:Date}
          {block:HasTags} tags: [
            {block:Tags} {
              tag: '{Tag}',
              urlSafeTag: '{URLSafeTag}',
              tagUrl: '{TagURL}',
              tagUrlChrono: '{TagURLChrono}'
            }, {/block:Tags}
          ], {/block:HasTags}
          {block:NoteCount} notes: {
            count: {NoteCount},
            countWithLabel: '{NoteCountWithLabel}'
          } {/block:NoteCount}
         },
         {/block:Posts}
      ]
    },
  }
})(window);
