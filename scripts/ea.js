/** @jsx React.DOM */
"use strict";

(function($, React) {

  /******************
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
  var instaFetch = {
    clientId: "57dbff39f8dc4b659e6489ac6dd68b45",
    apiUrl: "https://api.instagram.com/v1",

    fetchByTag: function(tag) {
      // Fetch the media given the provided tag
      var params = $.param({client_id: this.clientId, callback: "?"});
      //return $.getJSON(this.apiUrl + "/tags/" + tag + "/media/recent?" + params)
      return $.ajax({
        url: this.apiUrl + "/tags/" + tag + "/media/recent?" + params,
        dataType: "jsonp"});
    }
  };


  /************
   * Navigation
   */

  var NavBar = React.createClass({
    render: function() {
      return (
         <nav>
           <ul className="nav-buttons">
             <li><NavButton src="Countries" /></li>
             <li><NavButton src="Photographers" /></li>
           </ul>
           <h1><a href="/"><span className="everyday">Everyday</span>Africa</a></h1>
         </nav>);

    }
  });

  var NavButton = React.createClass({
    render: function() {
      return (<a className="nav-button" onClick={this.handleClick} href="#">
                {this.props.src}
              </a>);
    },

    handleClick: function(e) {
      e.preventDefault();
      console.log("WTFuckles");
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
      instaFetch.fetchByTag(this.props.tag)
        .done(function(d) {
            this.setState({data: d.data});
          }.bind(this))
        .fail(function(d) {
            alert("Failed to fetch tagged photos")
          });
    },


    render: function() {
      // Divide the images which fall on the left and the right
      var imageGroups = partition(this.state.data, 3);
      return (<div className="gallery">
                <GalleryColumn position="left" data={imageGroups[0]} />
                <div className="gallery-column center-column"></div>
                <GalleryColumn position="right" data={imageGroups[1]} />
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
                  var image = d.images.low_resolution,
                      isPortrait = image.height > image.width;

                  var classes = React.addons.classSet({
                    'tagged-image': true,
                    image: true,
                    portrait: isPortrait,
                    landscape: !isPortrait});

                  return <TaggedImage key={d.id} className={classes} image={image} data={d} />;
                })}
              </div>);
    }
  });

  // A single Image
  var TaggedImage = React.createClass({
    render: function() {
      return (<div className={this.props.className}>
                <a href={this.props.data.link}>
                  <img src={this.props.image.url} />
                </a>
              </div>);
    }
  });

  // The Image detail view
  var ImageDetail = React.createClass({
    render: function() {
      return (<div className="image-detail">
                <img src={this.props.image.url} />
                <p>More goes here</p>
              </div>);
    }
  });

  React.renderComponent(<NavBar />, $("header").get(0));
  React.renderComponent(<Gallery tag="everydayafrica" />, $("#content").get(0));

})(jQuery, React);
