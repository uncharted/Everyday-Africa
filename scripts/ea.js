/** @jsx React.DOM */
"use strict";

(function($, _, React, Router) {
  var Settings = {
    galleryBreakpoint: 600
  };


  /**
   * Internal Helpers
   */

  function tumblrTagUrl(tag) {
    return TumblrVars.blogUrl + "/tagged/" + tag;
  }

  /**
   * Partition a `list` with int `partitions` partitions, with
   * `per` items per partition
   */
  function partition(list, per, partitions) {
    partitions = partitions || 2;

    var partitioned = [];
    for (var i = 0; i < partitions; i++) {
      partitioned[i] = [];
    }

    for (var i = 0; i * per < list.length; i++) {
      var p = i % partitions,
              ipos = i * per;
      partitioned[p] = partitioned[p].concat(list.slice(ipos, ipos + per));
    }

    return partitioned;
  }

  /***************
   * Instagram API
   */
  var InstaFetch = {
    CLIENT_ID: "57dbff39f8dc4b659e6489ac6dd68b45",
    API_URL: "https://api.instagram.com/v1",
    cache: {},

    _params: function() {
      return $.param({client_id: this.CLIENT_ID, callback: "?"});
    },

    _fetcher: function(tag, total, url, deferred) {
      $.ajax({url: url, dataType: "jsonp"})
        .done(function(d) {
          d.data.forEach(function(datum) {
            this.cache[datum.id] = datum;
            deferred.notifyWith(this, [datum]);
          }.bind(this));
          if (total > _.size(this.cache)) {
            this._fetcher(tag, total, d.pagination.next_url, deferred)
          } else {
            deferred.resolveWith(this, [this.cache]);
          }
        }.bind(this))
        .fail(function(d) { deferred.rejectWith(this, [d]); });
    },

    populate: function(tag, total) {
      var url = this.API_URL + "/tags/" + tag + "/media/recent?" + this._params();
      var deferred = $.Deferred();

      this._fetcher(tag, total || 60, url, deferred);
      return deferred.promise();
    },

    /**
     * Get a single instagram media item, from the cache if possible
     *
     * Returns {meta: {...}, data: {...}} where `data` contains the data,
     * and meta is optional
     *  http://instagram.com/developer/endpoints/media/#get_media
     */
    get: function(id) {
      if (id in this.cache) {
        var resp = {data: this.cache[id]};
        return $.Deferred().resolveWith(this, [resp]).promise();
      } else {
        var url = this.API_URL + "/media/" + id + "?" + this._params();
        return $.ajax({url: url, dataType: "jsonp"})
          .done(function(d) {
            this.cache[d.data.id] = d.data;
          }.bind(this));
      }
    },

    userUrl: function(user) {
      return ["http://instagram.com", user].join("/");
    }
  };

  /************
   * Navigation
   */

  var NavBar = React.createClass({
    render: function() {
      return (
         <nav>
          <div id="nav-hamburger" className="nav-panel">
	     <a href="#" onClick={this.menuHandler}>
	       <img src={EAConfig.images.menu} />
	     </a>
          </div>
          <div id="nav-buttons" className="nav-panel">
            <ul>
              <li>
                <span className="hide-for-small"><NavToggleButton href="#/countries" src={EAConfig.images.africa} /></span>
                <img className="hide-for-large" src={EAConfig.images.africaWhite} /><span className="navlist">COUNTRIES</span></li>
              <li>
                <a href="#/photographers">
                  <img className="hide-for-small" src={EAConfig.images.photographer} />
                  <img className="hide-for-large" src={EAConfig.images.photographerWhite} />
                    <span className="navlist">PHOTOGRAPHERS</span></a></li>
              <li>
                <a href="#/search">
                  <img className="hide-for-small" src={EAConfig.images.search} />
                  <img className="hide-for-large" src={EAConfig.images.searchWhite} />
                    <span className="navlist">SEARCH</span></a></li>
              <li>
                <a href="#/about">
                  <img className="hide-for-small" src={EAConfig.images.about} />
                  <img className="hide-for-large" src={EAConfig.images.aboutWhite} />
                    <span className="navlist">ABOUT</span></a></li>
            </ul>
          </div>
           <h1><a href="/"><span className="everyday">Everyday</span>Africa</a></h1>
           <div id="share-buttons" className="nav-panel">
             <a href="http://instagram.com/everydayafrica"><img src={EAConfig.images.instagram} /></a>
             <a href="https://twitter.com/EverydayAfrica"><img src={EAConfig.images.twitter} /></a>
             <a href="https://www.facebook.com/everydayafrica"><img src={EAConfig.images.facebook} /></a>
             <a href="http://everydayafrica.tumblr.com/#me"><img src={EAConfig.images.tumblr} /></a>
           </div>
         </nav>);
    },

    menuHandler: function(e) {
      e.preventDefault();
      $("#nav-buttons").toggle();
    }
  });

  var NavToggleButton = React.createClass({
    componentWillMount: function() {
      this.setState(
	{target: this.props.href,
	 toggle: this.props.toggle || "#"});
    },

    // Get the next link
    href: function() {
      if (window.location.href.indexOf(this.state.target) == -1 ) {
	return this.state.target;
      } else {
	return this.state.toggle;
      }
    },

    render: function() {
      return (<a className="nav-button" href={this.href()} onClick={this.handleClick}>
	        <img src={this.props.src} />
              </a>);
    },

    handleClick: function() {
      this.forceUpdate();
    }
  });

  var Countries = React.createClass({
    render: function() {
      return (<div className="countries">
	        <h3>Countries</h3>
	        {_.map(this.props.data, function(data, country) {
		  return <Country key={country} country={country} data={data} />;
		}.bind(this))}
              </div>);
    }
  });

  var Country = React.createClass({
    render: function() {
      return (<div className="country">
	        <a href={tumblrTagUrl(this.props.country)}>
	          <img src={this.props.data.flag} alt={this.props.data.name} />
	          <h4>{this.props.data.name}</h4>
	        </a>
	      </div>);
    }
  });

  /********
   * Images
   */

  // The gallery of ALL images
  var Gallery = React.createClass({
    getInitialState: function() {
      return {data: []};
    },

    componentWillMount: function() {
      var total = TumblrVars.posts.photos.length * 24;
      InstaFetch.populate(this.props.tag, total)
        .done(function(d) {
          this.setState({
            data: _(d).values().first(total).map(function(media) {
              var img = media.images.low_resolution;
              return {
                id: media.id,
                url: img.url,
                width: img.width,
                height: img.height};
            })
	    .value()
          });
        }.bind(this))
        .fail(function(d) {
            console.log("Failed to fetch tagged photos")
          });

      this.state.tumblrData = TumblrVars.posts.photos.map(function(photo, i) {
        function sizedProp(prop) {
          return photo[prop + "500"];
        };

        return {
          id: i,
          url: sizedProp('photoUrl'),
          width: sizedProp('photoWidth'),
          height: sizedProp('photoHeight')};
      });
    },

    render: function() {
      // Divide the images which fall on the left and the right
      var width = $(window).width();

      if (width > Settings.galleryBreakpoint) {
        var imageGroups = partition(this.state.data, 3);
        var sideLength = 0.1 * width;
        var centerLength = 0.4 * width;
        return (<div className="gallery desktop">
                  <GalleryColumn type="instagram" position="left" imageLength={sideLength} data={imageGroups[0]} />
                  <GalleryColumn type="tumblr" position="center" imageLength={centerLength} data={this.state.tumblrData} />
                  <GalleryColumn type="instagram" position="right" imageLength={sideLength} data={imageGroups[1]} />
              </div>);
        } else {
          var single = width / 3;
          var dbl = single * 2;

          var instaGen = (function(data) {
            var index = 0;
            return function() {
              if (index < data.length) {
                var insta = data[++index];
                return <TaggedImage className="mobile image instagram"
                                    key={insta.id}
                                    imageLength={single}
                                    type="tumblr"
                                    image={insta} />;
              }
            };
          })(this.state.data);

          return (<div className="gallery mobile">
                    {_.map(this.state.tumblrData, function(p, i) {
                      var even = i % 2 === 0;
                      return (<div>
                                <div className="mobile-row dbl-row">
			          {!even &&
				   <div className="single-col left">
                                     {instaGen()}
                                     {instaGen()}
				   </div>}
                                  <TaggedImage className="mobile image tumblr"
                                               key={i}
                                               imageLength={dbl}
                                               type="tumblr"
                                               image={p} />
			          {even &&
				   <div className="single-col right">
                                     {instaGen()}
                                     {instaGen()}
				   </div>}
                                </div>
			        <div className="clear" />
                                <div className="mobile-row single-row">
                                  {instaGen()}
                                  {instaGen()}
                                  {instaGen()}
                                </div>
                              </div>);
                    }.bind(this))}
                  </div>);
        }
    }
  });

  // A column of images
  var GalleryColumn = React.createClass({
    render: function() {
      var classes = React.addons.classSet({
        'gallery-column': true,
        'left-column': this.props.position === "left",
        'right-column': this.props.position === "right",
        'center-column': this.props.position === "center"
      });

      return (<div className={classes}>
                {_(this.props.data).map(function(d) {
                  var isPortrait = d.height > d.width,
                      classes = React.addons.classSet({
                    'tagged-image': true,
                    image: true,
                    portrait: isPortrait,
                    landscape: !isPortrait});

                  return (<TaggedImage key={d.id}
                                       className={classes}
                                       imageLength={this.props.imageLength}
                                       type={this.props.type}
                                       image={d} />);
                }.bind(this))}
              </div>);
    }
  });

  // A single Image
  var TaggedImage = React.createClass({
    getDefaultProps: function() {
      return {scale: 1.5};
    },

    render: function() {
      var divStyle = {
        width: this.props.imageLength,
        height: this.props.imageLength };
      var imgStyle = {};

      if (this.props.image.width > this.props.image.height) {
        imgStyle.width = "140%";
      } else {
        imgStyle.height = "140%";
      }

      return (<div ref={this.props.key} className={this.props.className} style={divStyle}>
                 <a href={"#/posts/" + this.props.type + "/" + this.props.key}
	            style={divStyle}
	            onMouseEnter={this.mouseEnterHandler}
	            onMouseOut={this.mouseOutHandler}>
                   <img src={this.props.image.url} style={imgStyle} />
                 </a>
              </div>);
    },

    anchor: function() {
      return $(this.getDOMNode()).find("a");
    },

    componentDidMount: function() {
      var $anchor = this.anchor();
      this.setState({
	width: $anchor.width(),
	height: $anchor.height()});
      
    },

    mouseEnterHandler: function() {
      return;
      this.anchor()
        .css("position", "relative")
	.animate({width: this.state.width * this.props.scale,
		  height: this.state.height * this.props.scale,
		  "margin-left": "-=" + this.state.width * this.props.scale / 8,
		  "margin-top": "-=" + this.state.width * this.props.scale / 8});
    },

    mouseOutHandler: function() {
      return;
      this.anchor()
        .css("position", "initial")
	.animate({width: this.state.width,
		  height: this.state.height,
		  "margin-left": "+=" + this.state.width * this.props.scale / 8,
		  "margin-top": "+=" + this.state.width * this.props.scale / 8});
    }
  });

  // The Image detail view
  var ImageDetails = React.createClass({
    getSources: function() {
      return _.pick(this.props, ["tumblr", "instagram"]);
    },

    componentWillMount: function() {
      var active;
      if (this.props.active) {
        active = this.props.active;
      } else {
        if (this.props.tumblr) {
          active = "tumblr";
        } else if (this.props.instagram) {
          active = "instagram";
        }
      }
      this.setState({active: active});
    },

    componentDidMount: function() {
      if (this.props.instagramID) {
        InstaFetch.get(this.props.instagramID).done(function(d) {
          this.setProps({instagram: d.data})
        }.bind(this));
      }
    },

    render: function() {
      var count = _.values(this.getSources()).length;

      return (<div className="detail">
                <div className="overlay"><a href="#/"></a></div>
                <div className="image-detail">
                  <img src={this.props.image.url} className="image-large"/>
                  <div className="detail-panel">
                    <div className="detail-header">
                      <img src={this.props.user.profile_picture} />
                      <div>
                        <a href={InstaFetch.userUrl(this.props.user.username)}>
                          <h4>{this.props.user.username}</h4>
                        </a>
                        <h5>{moment.unix(this.props.created).fromNow()}</h5>
                      </div>
                      <button>Follow</button>
                    </div>
                    <p>{this.props.caption.replace("<p>", "").replace("</p>", "")}</p>
                    <div>
                      <ul className="sources">
                        {_(this.getSources())
			   .keys().sort()
			   .map(function(type) {
			     var style = {width: (100 / count) + "%"}
                             var classes = React.addons.classSet(
                               {active: type === this.props.active});
                               return <li key={type} className={classes} style={style}>
                                        <a href={this.props.url + "/" + type}>{type}</a>
                                      </li>;

                             }.bind(this))}
                      </ul>
                    </div>
	            {this.props.active === "tumblr" && this.props.tumblr &&
                      <TumblrDetails tags={this.props.tumblr.tags}
                                     notes={this.props.tumblr.notes}
                                     likeButton={this.props.tumblr.likeButton}
                                     reblogButton={this.props.tumblr.reblogButton} />}
	            {this.props.active === "instagram" && this.props.instagram &&
	              <InstagramDetails tags={this.props.instagram.tags}
	                                likes={this.props.instagram.likes}
	                                comments={this.props.instagram.comments} />}
                  </div>
                </div>
              </div>);
    },
  });

  var InstagramDetails = React.createClass({
    render: function() {
      return(<div className="instagram source-details">
               <TagList tags={_.map(this.props.tags, function(t) {
                 return {tag: t, url: "#"};
               })} />
               <div className="detail-hearts detail-list">
                 <div className="leftcol">
                   <img src={EAConfig.images.heart} className="icon"/>
                 </div>
                 <div className="rightcol">
                   <ul className="detail-hearts">
                     {this.props.likes.data.map(function(d) {
                        return <li>
                                 <a href={InstaFetch.userUrl(d.username)}>
                                   {d.username}
                                 </a>&emsp;
                               </li>; })}
                   </ul>
                 </div>
               </div>
               <CommentBox comments={{instagram: this.props.comments}}/>
	     </div>);
    }
  });

  var TumblrDetails = React.createClass({
    render: function() {
      return (<div className="tumblr source-details">
                <TagList tags={_.map(this.props.tags, function(t) {
                  return {tag: t.tag, url: t.tagUrl};
                })} />
                <p>{this.props.notes ? this.props.notes.count : "0"} Notes</p>
                <div dangerouslySetInnerHTML={{__html: this.props.likeButton}} />
                <div dangerouslySetInnerHTML={{__html: this.props.reblogButton}} />
              </div>);
    }
  });

  /**
   * TagList draws a list of tags for the detail views
   *
   * props: {tags: [{tag: string, url: string}]}
   */
  var TagList = React.createClass({
    render: function() {
        return (<div className="detail-tags detail-list">
                 <div className="leftcol">
                   <img src={EAConfig.images.tag} className="icon"/>
                 </div>
                 <div className="rightcol">
                   <ul>
                     {_(this.props.tags).map(function(t) {
                       return <li><a href={t.url}>{t.tag}</a></li>; })}
                   </ul>
                 </div>
               </div>);
    }
  });

  /*
   * Properties:
   *
   * props: {
   *   comments: {
   *     instagram: see above,
   *     tumblr: see above
   *   },
   *   active: "tumblr" | "instagram"
   * }
   *
   * The comment type selector will only contain the types for which
   * there are comments.
   */
  var CommentBox = React.createClass({
    getDefaultProps: function() {
      // Set the active comment type
      return {active: _.findKey(this.props.comments)};
    },

    // Get the currently active comments
    activeComments: function() {
      return this.props.comments[this.props.active].data;
    },

    render: function() {
      return (<div className="comments">
                <div>
                  {_.map(this.activeComments(), function(comment) {
                    return <Comment key={comment.id} data={comment} />;
                  }.bind(this))}
                  <div>
                  </div>
                </div>
              </div>);
    }
  })
  /*
   * Single Comment View
   */
  var Comment = React.createClass({
    render: function() {
      return (<div className="comment">
          <div className="leftcol">
            <img src={this.props.data.from.profile_picture} className="circle_profile" />
          </div>
            <div className="rightcol">
              <h4>{this.props.data.from.username}</h4>
              <p>{this.props.data.text}</p>
            </div>
              </div>);
    }
  });

  /**
   * Mount components, and wire up responsive layout
   */
  (function() {
    var gallery = <Gallery tag="everydayafrica" />;

    React.renderComponent(<NavBar />, $("header").get(0));
    React.renderComponent(gallery, $("#content").get(0));

    $(window).resize(function() { gallery.forceUpdate(); });
  })();

  /**
   * Generate the toggleable modal
   *
   * props: {
   * }
   */
  function ComponentHandler($root) {
    var rootElt = $root.get(0);

    this.show = function(component) {
	this.dismiss();
	React.renderComponent(component, rootElt);
    };

    this.dismiss = function() {
      return React.unmountComponentAtNode(rootElt);
    };
  }

  var Details = new ComponentHandler($("#modal"));
  var NavDrawer = new ComponentHandler($("#nav-drawer"));


  /*********
   * Routing
   */

  var router = Router({
    "/": function() {
      Details.dismiss();
    },

    "/countries": {
      on: function() {
	NavDrawer.show(<Countries data={EAConfig.countries} />);
      },
      after: function() {
	NavDrawer.dismiss();
      }
    },

    "/countries/:country": function() {
      console.log("Countries") },

    "/posts/tumblr/:id/?(\\w+)?": function(id, type) {
      var post = TumblrVars.posts.photos[id];
      if(post) {
        Details.show(
	    <ImageDetails id={id}
                          url={"#/posts/tumblr/" + id}
                          caption={post.caption}
                          created={1320232}
                          image={{url: post.photoUrl500,
                                  width: post.photoWidth500,
                                  height: post.photoHeight500}}
                          user={{profile_picture: TumblrVars.portraitUrl64,
                                 username: "jtmoulia"}}
                          tumblr={post}
                          active={type || "tumblr"}
                          instagramID="536018816062052929_145884981" />);
      }
    },

    "/posts/instagram/:id/?(\\w+)?": function(id, type) {
      var post = InstaFetch.cache[id];
      if(post) {
        Details.show(
	    <ImageDetails id={id}
                          url={"#/posts/instagram/" + id}
                          caption={post.caption.text}
                          image={post.images.standard_resolution}
	                  created={post.created_time}
                          user={post.user}
                          active={type || "instagram"}
	                  instagram={post} />);
      }
    }
  });
  router.init();

}(jQuery, _, React, Router));
