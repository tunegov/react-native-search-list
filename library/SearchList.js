import {
  View,
  Text,
  StyleSheet,
  ListView,
  PixelRatio,
  Animated,
  Image,
  Platform,
  SectionList,
  FlatList
} from "react-native";

import React, { Component } from "react";

import { sTrim } from "./utils/utils";

import SearchBar from "./components/SearchBar";
import pinyin from "js-pinyin";
import Toolbar from "./components/Toolbar";
import Touchable from "./utils/Touchable";
import SectionIndex from "./components/SectionIndex";
import PropTypes from "prop-types";
import Theme from "./components/Theme";
import SearchService from "./SearchService";
import HighlightableText from "./components/HighlightableText";

export default class SearchList extends Component {
  static propTypes = {
    caseInsensitiveSearch: PropTypes.bool,
    data: PropTypes.array.isRequired,
    // use `renderRow` to get much more freedom
    rowHeight: PropTypes.number.isRequired,

    hideSectionList: PropTypes.bool,

    sectionHeaderHeight: PropTypes.number,

    searchListBackgroundColor: PropTypes.string,

    toolbarBackgroundColor: PropTypes.string,

    searchBarToggleDuration: PropTypes.number,
    searchBarBackgroundColor: PropTypes.string,

    searchInputBackgroundColor: PropTypes.string,
    searchInputBackgroundColorActive: PropTypes.string,
    // default state text color for the search input
    searchInputTextColor: PropTypes.string,
    // active state text color for the search input
    searchInputTextColorActive: PropTypes.string,
    searchInputPlaceholderColor: PropTypes.string,
    searchInputPlaceholder: PropTypes.string,

    title: PropTypes.string,
    titleTextColor: PropTypes.string,

    cancelTitle: PropTypes.string,
    cancelTextColor: PropTypes.string,

    // use `renderSectionIndexItem` to get much more freedom
    sectionIndexTextColor: PropTypes.string,
    renderSectionIndexItem: PropTypes.func,

    sortFunc: PropTypes.func,
    resultSortFunc: PropTypes.func,

    onScrollToSection: PropTypes.func,

    renderBackButton: PropTypes.func,
    renderEmpty: PropTypes.func,
    renderEmptyResult: PropTypes.func,
    renderSeparator: PropTypes.func,
    renderSectionHeader: PropTypes.func,
    renderHeader: PropTypes.func,
    renderFooter: PropTypes.func,
    // custom render row
    renderRow: PropTypes.func.isRequired,

    onSearchStart: PropTypes.func,
    onSearchEnd: PropTypes.func
  };

  static defaultProps = {
    sectionHeaderHeight: Theme.size.sectionHeaderHeight,
    rowHeight: Theme.size.rowHeight,
    sectionIndexTextColor: "#171a23",
    searchListBackgroundColor: Theme.color.primaryDark,
    toolbarBackgroundColor: Theme.color.primaryDark,
    caseInsensitiveSearch: false
  };

  constructor(props) {
    super(props);
    this.state = {
      isSearching: false,
      animatedValue: new Animated.Value(0),
      sections: [],
      stickyHeaderIndices: []
    };

    this.searchStr = "";
    this.sectionIDs = [];
    this.copiedSource = [];

    pinyin.setOptions({ checkPolyphone: false, charCase: 2 });
  }

  static getSectionData(dataBlob, sectionID) {
    return dataBlob[sectionID];
  }

  static getRowData(dataBlob, sectionID, rowID) {
    return dataBlob[sectionID + ":" + rowID];
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps && this.props.data !== nextProps.data) {
      this.initList(nextProps.data);
    }
  }

  componentDidMount() {
    this.initList(this.props.data);
  }

  initList(data = []) {
    const stickyHeaderIndices = data
      .map((item, i) => ({ i, header: item.header }))
      .filter(item => item.header)
      .map(item => item.i)

    this.copiedSource = Array.from(data);
    this.setState({
      stickyHeaderIndices,
      data: this.copiedSource
    })

    this.parseInitList(
      SearchService.sortList(
        SearchService.initList(this.copiedSource),
        this.props.sortFunc
      )
    );
  }

  parseInitList(srcList) {
    const { rowsWithSection, sectionIDs, rowIds } = SearchService.parseList(
      srcList
    );
    this.sectionIDs = sectionIDs;
    this.rowIds = rowIds;
    this.setState({
      isSearching: false,
      sections: sectionIDs.map(l => ({
        title: l,
        data: srcList.filter(i => i.orderIndex === l)
      })),
      data: srcList
    });
  }

  search(input) {
    this.searchStr = input;
    if (input) {
      input = sTrim(input);
      const tempResult = SearchService.search(
        this.copiedSource,
        input.toLowerCase()
      );
      if (tempResult.length === 0) {
        this.setState({
          isSearching: true,
        });
      } else {
        const {
          searchResultWithSection,
          rowIds
        } = SearchService.sortResultList(tempResult, this.props.resultSortFunc);

        this.rowIds = rowIds;
        const data = this.copiedSource.filter(i =>
          this.props.caseInsensitiveSearch ?
            i.searchStr.toLowerCase().includes(this.searchStr.toLowerCase())
            :
            i.searchStr.includes(this.searchStr)
        )
        this.setState({
          isSearching: true,
          sections: [
            {
              title: "",
              data
            }
          ],
          data
        });
      }
    } else {
      this.parseInitList(this.copiedSource);
    }
  }

  /**
   * default section header in ListView
   * @param sectionData
   * @param sectionID
   * @returns {XML}
   * @private
   */
  _renderSectionHeader(sectionData, sectionID) {
    if (!sectionID) {
      return <View />;
    } else {
      return (
        <View
          style={[
            styles.sectionHeader,
            { height: this.props.sectionHeaderHeight }
          ]}
        >
          <View
            style={{
              justifyContent: "center",
              height: this.props.sectionHeaderHeight
            }}
          >
            <Text style={styles.sectionTitle}>{sectionID}</Text>
          </View>
        </View>
      );
    }
  }

  /**
   * default section index item
   * @param sectionData
   * @param sectionID
   * @returns {XML}
   * @private
   */
  _renderSectionIndexItem(sectionData, sectionID) {
    return (
      <Text
        style={{
          textAlign: "center",
          color: this.props.sectionIndexTextColor,
          fontSize: 14,
          height: 16
        }}
      >
        {sectionID}
      </Text>
    );
  }

  /**
   * default render Separator
   * @param sectionID
   * @param rowID
   * @param adjacentRowHighlighted
   * @returns {XML}
   */
  _renderSeparator(sectionID, rowID, adjacentRowHighlighted) {
    let style = styles.rowSeparator;
    if (adjacentRowHighlighted) {
      style = [style, styles.rowSeparatorHide];
    }
    return (
      <View key={"SEP_" + sectionID + "_" + rowID} style={style}>
        <View
          style={{
            height: 1 / PixelRatio.get(),
            backgroundColor: "#efefef"
          }}
        />
      </View>
    );
  }

  /**
   * render default list view footer
   * @returns {XML}
   * @private
   */
  _renderFooter() {
    return <View style={styles.scrollSpinner} />;
  }

  /**
   * render default list view header
   * @returns {null}
   * @private
   */
  _renderHeader() {
    return null;
  }

  /**
   *
   * @param item
   * @param sectionID
   * @param rowID
   * @param highlightRowFunc
   * @returns {XML}
   * @private
   */
  _renderRow(item, sectionID, rowID, highlightRowFunc) {
    return (
      <View
        style={{
          flex: 1,
          marginLeft: 20,
          height: this.props.rowHeight,
          justifyContent: "center"
        }}
      >
        <HighlightableText text={item.searchStr} matcher={item.matcher} />
      </View>
    );
  }

  _renderItem({ item }) {
    return (
      <View
        style={{
          flex: 1,
          marginLeft: 20,
          height: this.props.rowHeight,
          justifyContent: "center"
        }}
      >
        <HighlightableText text={item.searchStr} matcher={item.matcher} />
      </View>
    );
  }

  enterSearchState() {
    //     this.setState({isSearching: true})
    //     Animated.timing(this.state.animatedValue, {
    //       duration: this.props.searchBarToggleDuration || Theme.duration.toggleSearchBar,
    //       toValue: 1,
    //       useNativeDriver: true
    //     }).start(() => {
    //     })
  }

  exitSearchState() {
    Animated.timing(this.state.animatedValue, {
      duration:
        this.props.searchBarToggleDuration || Theme.duration.toggleSearchBar,
      toValue: 0,
      useNativeDriver: true
    }).start(() => {
      this.search("");
      this.setState({ isSearching: false });
    });
  }

  onFocus() {
    if (!this.state.isSearching) {
      this.enterSearchState();
    }
    this.props.onSearchStart && this.props.onSearchStart();
  }

  onBlur() {
    this.props.onSearchEnd && this.props.onSearchEnd();
  }

  onClickCancel() {
    this.exitSearchState();
    this.props.onSearchEnd && this.props.onSearchEnd();
  }

  cancelSearch() {
    this.refs.searchBar &&
      this.refs.searchBar.cancelSearch &&
      this.refs.searchBar.cancelSearch();
  }

  scrollToSection(section) {
    if (!this.sectionIDs || this.sectionIDs.length === 0) {
      return;
    }
    let y = this.props.headerHeight || 0;

    let rowHeight = this.props.rowHeight;
    let index = this.sectionIDs.indexOf(section);

    let numcells = 0;
    for (let i = 0; i < index && i < this.rowIds.length; i++) {
      numcells += this.rowIds[i].length;
    }

    y += numcells * rowHeight;
    const item = this.state.data.find(item => item.name === section)

    if (this.refs.searchListView) {
      this.refs.searchListView.scrollToItem({ item, animated: true });
    }

    if (this.searchSectionViewRef) {
      setTimeout(() => {
        this.searchSectionViewRef.scrollToLocation({
          animated: true,
          sectionIndex: index,
          itemIndex: 0,
          viewPosition: 0
        });
      }, 100);
    }

    this.props.onScrollToSection && this.props.onScrollToSection(section);
  }

  render() {
    return (
      <Animated.View
        ref="view"
        style={[
          {
            // 考虑上动画以后页面要向上移动，这里必须拉长
            height: Theme.size.windowHeight + Theme.size.toolbarHeight,
            width: Theme.size.windowWidth,
            transform: [
              {
                translateY: this.state.animatedValue.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -Theme.size.toolbarHeight]
                })
              }
            ]
          },
          this.props.style
        ]}
      >
        <View
          style={[
            {
              flex: 1,
              backgroundColor: this.props.searchListBackgroundColor
            }
          ]}
        >
          <SearchBar
            placeholder={
              this.props.searchInputPlaceholder
                ? this.props.searchInputPlaceholder
                : ""
            }
            onChange={this.search.bind(this)}
            onFocus={this.onFocus.bind(this)}
            onBlur={this.onBlur.bind(this)}
            onClickCancel={this.onClickCancel.bind(this)}
            cancelTitle={this.props.cancelTitle}
            cancelTextColor={this.props.cancelTextColor}
            searchBarBackgroundColor={this.props.searchBarBackgroundColor}
            searchInputBackgroundColor={this.props.searchInputBackgroundColor}
            searchInputBackgroundColorActive={
              this.props.searchInputBackgroundColorActive
            }
            searchInputPlaceholderColor={this.props.searchInputPlaceholderColor}
            searchInputTextColor={this.props.searchInputTextColor}
            searchInputTextColorActive={this.props.searchInputTextColorActive}
            ref="searchBar"
          />
          {this._renderStickHeader()}

          <View
            shouldRasterizeIOS
            renderToHardwareTextureAndroid
            style={styles.listContainer}
          >
            {this._renderSearchBody.bind(this)()}
            {this._renderSectionIndex.bind(this)()}
          </View>
        </View>
        {this._renderMask.bind(this)()}
      </Animated.View>
    );
  }

  _getItemLayout(data, index) {
    return {
      length: this.props.rowHeight,
      offset: this.props.rowHeight * index,
      index
    };
  }

  _getItemLayoutFlat(data, index) {
    const height = (data.header ? 24 : this.props.rowHeight) || 0;
    const offset = Array.from(this.copiedSource)
      .slice(0, index)
      .reduce((prev, curr, index, array) => {
        return prev += curr.header ? 24 : this.props.rowHeight
      }, 0)
    return {
      length: height,
      offset,
      index
    };
  }

  /**
   * render the main list view
   * @returns {*}
   * @private
   */
  _renderSearchBody() {
    const { isSearching } = this.state;
    const { renderEmptyResult, renderEmpty, data } = this.props;

    const isEmptyResult = this.props.data.length === 0;
    if (isSearching && isEmptyResult && renderEmptyResult) {
      return renderEmptyResult(this.searchStr);
    } else {
      if (data && data.length > 0) {
        if (this.props.useSectionsList) {
          return (
            <SectionList
              ref={ref => (this.searchSectionViewRef = ref)}
              renderItem={this.props.renderItem || this._renderItem.bind(this)}
              renderSectionHeader={
                this.props.renderSectionHeader ||
                this._renderSectionHeader.bind(this)
              }
              getItemLayout={this._getItemLayout.bind(this)}
              sections={this.state.sections}
              keyExtractor={(item, index) => `${item.id}_${index}`}
              initialNumToRender={110}
              maxToRenderPerBatch={100}
            />
          );
        }
        return (
          <FlatList
            ref="searchListView"
            data={this.state.data}
            keyExtractor={(item, index) => `${index}`}
            renderItem={this.props.renderItem || this.renderItem.bind(this)}
            removeClippedSubviews={false}
            getItemLayout={this._getItemLayoutFlat.bind(this)}
            stickyHeaderIndices={this.state.stickyHeaderIndices}
            onScrollToIndexFailed={() => null}

          />
        );
      } else {
        if (renderEmpty) {
          return renderEmpty();
        }
      }
    }
  }

  /**
   * render a custom stick header, isSearching is pass to renderStickHeader
   * @returns {*}
   * @private
   */
  _renderStickHeader() {
    const { renderStickHeader } = this.props;
    const { isSearching } = this.state;
    return renderStickHeader ? renderStickHeader(isSearching) : null;
  }

  /**
   * render the modal mask when searching
   * @returns {XML}
   * @private
   */
  _renderMask() {
    const { isSearching } = this.state;
    if (isSearching && !this.searchStr) {
      return (
        <Touchable
          onPress={this.cancelSearch.bind(this)}
          underlayColor="rgba(0, 0, 0, 0.0)"
          style={[styles.maskStyle]}
        >
          <Animated.View />
        </Touchable>
      );
    }
  }

  /**
   * render back button on the Toolbar
   * @returns {XML}
   * @private
   */
  _renderBackButton() {
    return (
      <Touchable onPress={this.props.onPress}>
        <Image
          hitSlop={{ top: 10, left: 20, bottom: 10, right: 20 }}
          style={[
            {
              width: 20,
              height: 20,
              paddingLeft: 15,
              paddingRight: 15
            }
          ]}
          source={require("./images/icon-back.png")}
        />
      </Touchable>
    );
  }

  /**
   * render the alphabetical index
   * @returns {*}
   * @private
   */
  _renderSectionIndex() {
    const { hideSectionList } = this.props;
    if (hideSectionList) {
      return null;
    } else {
      return (
        <View
          pointerEvents={"box-none"}
          style={{
            position: "absolute",
            right: 0,
            top: 15,
            bottom: Theme.size.toolbarHeight,
            flexDirection: "column",
            justifyContent: "center"
          }}
        >
          <SectionIndex
            style={{
              opacity: this.state.animatedValue.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0]
              })
            }}
            onSectionSelect={this.scrollToSection.bind(this)}
            sections={this.sectionIDs}
            renderSectionItem={
              this.props.renderSectionIndexItem ||
              this._renderSectionIndexItem.bind(this)
            }
          />
        </View>
      );
    }
  }
}

const styles = StyleSheet.create({
  listContainer: {
    flexDirection: "row",
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#fff"
  },
  rowSeparator: {
    backgroundColor: "#fff",
    paddingLeft: 25
  },
  rowSeparatorHide: {
    opacity: 0.0
  },
  sectionHeader: {
    flex: 1,
    height: Theme.size.sectionHeaderHeight,
    justifyContent: "center",
    paddingLeft: 25,
    backgroundColor: "#efefef"
  },
  sectionTitle: {
    color: "#979797",
    fontSize: 14
  },
  separator2: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    height: 1 / PixelRatio.get(),
    marginVertical: 1
  },
  maskStyle: {
    position: "absolute",
    top: Theme.size.headerHeight + Theme.size.searchInputHeight,
    // top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Theme.color.maskColor,
    zIndex: 999
  },
  scrollSpinner: {
    ...Platform.select({
      android: {
        height: Theme.size.searchInputHeight
      },
      ios: {
        marginVertical: 40
      }
    })
  }
});
