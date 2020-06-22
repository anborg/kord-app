import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NavLink } from "react-router-dom";
import { connect } from "react-redux";
import {
  faMusic,
  faSearch,
  faEllipsisH
} from "@fortawesome/free-solid-svg-icons";
import PropTypes from "prop-types";
import React from "react";

import Player from "../player";
import styles from "../../styles/footer.module.css";

const Footer = ({ location, libHistory }) => {
  const { pathname } = location;
  const pastLibRoute =
    libHistory && libHistory.length
      ? libHistory[libHistory.length - 1]
      : "/app/library";

  const libNavSecondTap = pastLibRoute === pathname;

  return (
    <div style={{ marginTop: "auto" }}>
      <Player />
      <footer className={styles.footer}>
        <NavLink
          to={`${libNavSecondTap ? "/app/library" : pastLibRoute}`}
          className={styles.navLink}
          activeClassName={styles.active}
        >
          <div className={styles.navWrap}>
            <FontAwesomeIcon icon={faMusic} />
            Library
          </div>
        </NavLink>
        <NavLink
          exact
          to="/app/search"
          className={styles.navLink}
          activeClassName={styles.active}
        >
          <div className={styles.navWrap}>
            <FontAwesomeIcon icon={faSearch} />
            Search
          </div>
        </NavLink>
        <NavLink
          exact
          to="/app/more"
          className={styles.navLink}
          activeClassName={styles.active}
        >
          <div className={styles.navWrap}>
            <FontAwesomeIcon icon={faEllipsisH} />
            More
          </div>
        </NavLink>
      </footer>
    </div>
  );
};

Footer.propTypes = {
  location: PropTypes.shape({
    pathname: PropTypes.string
  }).isRequired,
  libHistory: PropTypes.arrayOf(PropTypes.string).isRequired
};

Footer.defaultProps = {
  libHistory: []
};

const mapStateToProps = state => ({
  libHistory: state.user.history.library
});

export default connect(mapStateToProps)(Footer);
