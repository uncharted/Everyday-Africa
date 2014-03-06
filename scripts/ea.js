/** @jsx React.DOM */
"use strict";

$(function() {

  /**
   * Internal Helpers
   */

  /*
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

    //
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
      var params = $.param({client_id: this.CLIENT_ID, callback: "?"}),
          url = this.API_URL + "/tags/" + tag + "/media/recent?" + params,
          deferred = $.Deferred();

      this._fetcher(tag, total || 60, url, deferred);
      return deferred.promise();
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
              <li><NavToggleButton href="#/countries" src={EAConfig.images.africa} /><span className="navlist">COUNTRIES</span></li>
              <li><a href="#/photographers"><img src={EAConfig.images.photographer} /><span className="navlist">PHOTOGRAPHERS</span></a></li>
              <li><a href="#/search"><img src={EAConfig.images.search} /><span className="navlist">SEARCH</span></a></li>
              <li><a href="#/about"><img src={EAConfig.images.about} /><span className="navlist">ABOUT</span></a></li>
            </ul>
          </div>
           <h1><a href="/"><span className="everyday">Everyday</span>Africa</a></h1>
           <div id="share-buttons" className="nav-panel">
             <a href="#/instagram"><img src={EAConfig.images.instagram} /></a>
             <a href="#/twitter"><img src={EAConfig.images.twitter} /></a>
             <a href="#/facebook"><img src={EAConfig.images.facebook} /></a>
             <a href="#/tumblr"><img src={EAConfig.images.tumblr} /></a>
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
	        <a href={"#/countries/" + this.props.country}>
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
      var total = TumblrVars.Posts.Photos.length * 24;
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
            alert("Failed to fetch tagged photos")
          });

      this.state.tumblrData = TumblrVars.Posts.Photos.map(function(photo, i) {
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
      var imageGroups = partition(this.state.data, 3),
          width = window.innerWidth,
          sideLength = 0.1 * width,
          centerLength = 0.4 * width;

      //debugger;
      return (<div className="gallery">
                <GalleryColumn type="instagram" position="left" imageLength={sideLength} data={imageGroups[0]} />
                <GalleryColumn type="tumblr" position="center" imageLength={centerLength} data={this.state.tumblrData} />
                <GalleryColumn type="instagram" position="right" imageLength={sideLength} data={imageGroups[1]} />
              </div>);
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
                {this.props.data.map(function(d) {
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
      var imgStyle = {'margin-top': "-20%",
                      'margin-left': "-20%"};
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
  var ImageDetail = React.createClass({
    render: function() {
      console.log(this.props.data);
      return (<div className="detail">
                <div className="overlay"><a href="#/"></a></div>
                <div className="image-detail">
                  <img src={this.props.data.image.url} className="image-large"/>
                  <div className="detail-panel">
                    <div className="detail-header">
                      <img src={this.props.data.user.profile_picture} />
                      <div>
                        <a href={InstaFetch.userUrl(this.props.data.user.username)}>
                          <h4>{this.props.data.user.username}</h4>
                        </a>
                        <h5>{moment.unix(this.props.data.created).fromNow()}</h5>
                      </div>
                      <button>Follow</button>
                    </div>
                    <div className="caption">
                      <p>{this.props.data.caption}</p>
                      <ul className="detail-tags">
                        <div className="leftcol">
                          <img src={EAConfig.images.tag} className="icon"/>
                        </div>
                        <div className="rightcol">
                          {this.props.data.tags.map(function(d) {
                           return <li>{d}</li>; })}
                        </div>
                      </ul>
                      <ul className="detail-hearts">
                        <div className="leftcol">
                          <img src={EAConfig.images.heart} className="icon"/>
                        </div>
                          <div className="rightcol">
                            {this.props.data.likes.data.map(function(d) {
                             return <li>
                                <a href={InstaFetch.userUrl(d.username)}>
                                  {d.username}
                                </a>&emsp;
                              </li>; })}
                          </div>
                      </ul>
                    </div>
                    <CommentBox comments={{instagram: this.props.data.comments}}/>
                  </div>
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
                  <ul className="comment-source">
                    {_.map(_.keys(this.props.comments).sort(), function(type) {
                    var classes = React.addons.classSet(
                      {active: type === this.props.active});
                      return <li key={type} className={classes}>{type}</li>;
                    }.bind(this))}
                  </ul>
                </div>
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

  (function() {
    var gallery = <Gallery tag="everydayafrica" />;

    React.renderComponent(<NavBar />, $("header").get(0));
    React.renderComponent(gallery, $("#content").get(0));

    //Redraw on resize
    $(window).resize(function() { gallery.forceUpdate(); });
  })();
  
  /**
   * Generate the toggleable modal
   */
  var Details = {
    root: $("#modal").get(0),

    // Show the detail view for the given data
    show: function(data) {
      this.dismiss();
      React.renderComponent(<ImageDetail data={data} />, this.root);
    },

    dismiss: function(params) {
      return React.unmountComponentAtNode(this.root);
    }
  };

  var NavDrawer = {
    root: $("#nav-drawer").get(0),

    show: function(component) {
      this.dismiss;
      React.renderComponent(component, this.root);
    },

    dismiss: function() {
      React.unmountComponentAtNode(this.root);
    }
  };


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

    "/posts/instagram/:post": function(post) {
      var post = InstaFetch.cache[post];
      if(post) {
        // Convert data to common format
        Details.show({
          caption: post.caption.text,
          comments: post.comments,
          created: post.created_time,
          likes: post.likes,
          image: post.images.standard_resolution,
          tags: post.tags,
          user: post.user
        });
      }
    },
    "/posts/tumblr/:post": function(post) {
      var post = TumblrVars.Posts.Photos[post];
      if(post) {
        Details.show({
	  caption: "Some text",
	  comments: {data: [], count: 0},
	  created: 1320232,
	  likes: {data: [], count: 0},
	  image: {url: post.photoUrl500},
	  tags: [],
	  user: "jtmoulia"
	});
      }
    },
  });
  router.init();

});
