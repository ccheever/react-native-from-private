/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule ListViewDataSource
 * @typechecks
 * @flow
 */
'use strict';

var invariant = require('invariant');
var isEmpty = require('isEmpty');
var warning = require('warning');

/**
 * ListViewDataSource - Provides efficient data processing and access to the
 * ListView component.  A ListViewDataSource is created with functions for
 * extracting data from the input blob, and comparing elements (with default
 * implementations for convenience).  The input blob can be as simple as an
 * array of strings, or an object with rows nested inside section objects.
 *
 * To update the data in the datasource, use `cloneWithRows` (or
 * `cloneWithRowsAndSections` if you care about sections).  The data in the
 * data source is immutable, so you can't modify it directly.  The clone methods
 * suck in the new data and compute a diff for each row so ListView knows
 * whether to re-render it or not.
 *
 * In this example, a component receives data in chunks, handled by
 * `_onDataArrived`, which concats the new data onto the old data and updates the
 * data source.  We use `concat` to create a new array - mutating `this._data`,
 * e.g. with `this._data.push(newRowData)`, would be an error. `_rowHasChanged`
 * understands the shape of the row data and knows how to efficiently compare
 * it.
 *
 *   getInitialState: function() {
 *     var ds = new ListViewDataSource({rowHasChanged: this._rowHasChanged});
 *     return {ds};
 *   },
 *   _onDataArrived(newData) {
 *     this._data = this._data.concat(newData);
 *     this.setState({
 *       ds: this.state.ds.cloneWithRows(this._data)
 *     });
 *   }
 */

function defaultGetRowData(
  dataBlob: any,
  sectionID: number | string,
  rowID: number | string
): any {
  return dataBlob[sectionID][rowID];
}

function defaultGetSectionHeaderData(
  dataBlob: any,
  sectionID: number | string
): any {
  return dataBlob[sectionID];
}

type differType = (data1: any, data2: any) => bool;

type ParamType = {
  rowHasChanged: differType;
  getRowData: ?typeof defaultGetRowData;
  sectionHeaderHasChanged: ?differType;
  getSectionHeaderData: ?typeof defaultGetSectionHeaderData;
}

class ListViewDataSource {

  /**
   * @param {ParamType} params
   *
   * You can provide custom extraction and 'hasChanged' functions for section
   * headers and rows.  If absent, data will be extracted with the
   * `defaultGetRowData` and `defaultGetSectionHeaderData` functions.
   *
   * - getRowData(dataBlob, sectionID, rowID);
   * - getSectionHeaderData(dataBlob, sectionID);
   * - rowHasChanged(prevRowData, nextRowData);
   * - sectionHeaderHasChanged(prevSectionData, nextSectionData);
   */
  constructor(params: ParamType) {
    invariant(
      params && typeof params.rowHasChanged === 'function',
      'Must provide a rowHasChanged function.'
    );
    this._rowHasChanged = params.rowHasChanged;
    this._getRowData = params.getRowData || defaultGetRowData;
    this._sectionHeaderHasChanged = params.sectionHeaderHasChanged;
    this._getSectionHeaderData =
      params.getSectionHeaderData || defaultGetSectionHeaderData;

    this._dataBlob = null;
    this._dirtyRows = [];
    this._dirtySections = [];
    this._cachedRowCount = 0;

    // These two private variables are accessed by outsiders because ListView
    // uses them to iterate over the data in this class.
    this.rowIdentities = [];
    this.sectionIdentities = [];
  }

  /**
  * @param {object} dataBlob -- This is an arbitrary blob of data. An extractor
  *    function was defined at construction time.  The default extractor assumes
  *    the data is a plain array or keyed object.
  */
  cloneWithRows(
    dataBlob: Array<any> | {[key: string]: any},
    rowIdentities: ?Array<string>
  ): ListViewDataSource {
    var rowIds = rowIdentities ? [rowIdentities] : null;
    if (!this._sectionHeaderHasChanged) {
      this._sectionHeaderHasChanged = () => false;
    }
    return this.cloneWithRowsAndSections({s1: dataBlob}, ['s1'], rowIds);
  }

  /**
   * @param {object} dataBlob -- This is an arbitrary blob of data. An extractor
   *    function was defined at construction time.  The default extractor assumes
   *    the data is a nested array or keyed object of the form:
   *
   *      { sectionID_1: { rowID_1: <rowData1>, ... }, ... }
   *
   *    or
   *
   *      [ [ <rowData1>, <rowData2>, ... ], ... ]
   *
   * @param {array} sectionIdentities -- This is an array of identifiers for
   *    sections. ie. ['s1', 's2', ...].  If not provided, it's assumed that the
   *    keys of dataBlob are the section identities.
   * @param {array} rowIdentities -- This is a 2D array of identifiers for rows.
   *    ie. [['a1', 'a2'], ['b1', 'b2', 'b3'], ...].  If not provided, it's
   *    assumed that the keys of the section data are the row identities.
   *
   * Note: this returns a new object!
   */
  cloneWithRowsAndSections(
    dataBlob: any,
    sectionIdentities: ?Array<string>,
    rowIdentities: ?Array<Array<string>>
  ): ListViewDataSource {
    invariant(
      typeof this._sectionHeaderHasChanged === 'function',
      'Must provide a sectionHeaderHasChanged function with section data.'
    );
    var newSource = new ListViewDataSource({
      getRowData: this._getRowData,
      getSectionHeaderData: this._getSectionHeaderData,
      rowHasChanged: this._rowHasChanged,
      sectionHeaderHasChanged: this._sectionHeaderHasChanged,
    });
    newSource._dataBlob = dataBlob;
    if (sectionIdentities) {
      newSource.sectionIdentities = sectionIdentities;
    } else {
      newSource.sectionIdentities = Object.keys(dataBlob);
    }
    if (rowIdentities) {
      newSource.rowIdentities = rowIdentities;
    } else {
      newSource.rowIdentities = [];
      newSource.sectionIdentities.forEach((sectionID) => {
        newSource.rowIdentities.push(Object.keys(dataBlob[sectionID]));
      });
    }
    newSource._cachedRowCount = countRows(newSource.rowIdentities);

    newSource._calculateDirtyArrays(
      this._dataBlob,
      this.sectionIdentities,
      this.rowIdentities
    );

    return newSource;
  }

  getRowCount(): number {
    return this._cachedRowCount;
  }

  /**
   * @param {number} sectionIndex
   * @param {number} rowIndex
   *
   * Returns if the row is dirtied and needs to be rerendered
   */
  rowShouldUpdate(sectionIndex: number, rowIndex: number): bool {
    var needsUpdate = this._dirtyRows[sectionIndex][rowIndex];
    warning(needsUpdate !== undefined,
      'missing dirtyBit for section, row: ' + sectionIndex + ', ' + rowIndex);
    return needsUpdate;
  }

  /**
   * @param {number} sectionIndex
   * @param {number} rowIndex
   *
   * Gets the data required to render the row.
   */
  getRowData(sectionIndex: number, rowIndex: number): any {
    var sectionID = this.sectionIdentities[sectionIndex];
    var rowID = this.rowIdentities[sectionIndex][rowIndex];
    warning(
      sectionID !== undefined && rowID !== undefined,
      'rendering invalid section, row: ' + sectionIndex + ', ' + rowIndex
    );
    return this._getRowData(this._dataBlob, sectionID, rowID);
  }

  /**
   * @param {number} index
   *
   * Gets the rowID at index provided if the dataSource arrays were flattened,
   * or null of out of range indexes.
   */
  getRowIDForFlatIndex(index: number): ?string {
    var accessIndex = index;
    for (var ii = 0; ii < this.sectionIdentities.length; ii++) {
      if (accessIndex >= this.rowIdentities[ii].length) {
        accessIndex -= this.rowIdentities[ii].length;
      } else {
        return this.rowIdentities[ii][accessIndex];
      }
    }
    return null;
  }

  /**
   * @param {number} index
   *
   * Gets the sectionID at index provided if the dataSource arrays were flattened,
   * or null for out of range indexes.
   */
  getSectionIDForFlatIndex(index: number): ?string {
    var accessIndex = index;
    for (var ii = 0; ii < this.sectionIdentities.length; ii++) {
      if (accessIndex >= this.rowIdentities[ii].length) {
        accessIndex -= this.rowIdentities[ii].length;
      } else {
        return this.sectionIdentities[ii];
      }
    }
    return null;
  }

  /**
   * Returns an array containing the number of rows in each section
   */
  getSectionLengths(): Array<number> {
    var results = [];
    for (var ii = 0; ii < this.sectionIdentities.length; ii++) {
      results.push(this.rowIdentities[ii].length);
    }
    return results;
  }

  /**
   * @param {number} sectionIndex
   *
   * Returns if the section header is dirtied and needs to be rerendered
   */
  sectionHeaderShouldUpdate(sectionIndex: number): bool {
    var needsUpdate = this._dirtySections[sectionIndex];
    warning(needsUpdate !== undefined,
      'missing dirtyBit for section: ' + sectionIndex);
    return needsUpdate;
  }

  /**
   * @param {number} sectionIndex
   *
   * Gets the data required to render the section header
   */
  getSectionHeaderData(sectionIndex: number): any {
    if (!this._getSectionHeaderData) {
      return null;
    }
    var sectionID = this.sectionIdentities[sectionIndex];
    warning(sectionID !== undefined,
      'renderSection called on invalid section: ' + sectionIndex);
    return this._getSectionHeaderData(this._dataBlob, sectionID);
  }

  /**
   * Private members and methods.
   */

  _getRowData: typeof defaultGetRowData;
  _getSectionHeaderData: typeof defaultGetSectionHeaderData;
  _rowHasChanged: differType;
  _sectionHeaderHasChanged: ?differType;

  _dataBlob: any;
  _dirtyRows: Array<Array<bool>>;
  _dirtySections: Array<bool>;
  _cachedRowCount: number;

  // These two 'protected' variables are accessed by ListView to iterate over
  // the data in this class.
  rowIdentities: Array<Array<string>>;
  sectionIdentities: Array<string>;

  _calculateDirtyArrays(
    prevDataBlob: any,
    prevSectionIDs: Array<string>,
    prevRowIDs: Array<Array<string>>
  ): void {
    // construct a hashmap of the existing (old) id arrays
    var prevSectionsHash = keyedDictionaryFromArray(prevSectionIDs);
    var prevRowsHash = {};
    for (var ii = 0; ii < prevRowIDs.length; ii++) {
      var sectionID = prevSectionIDs[ii];
      warning(
        !prevRowsHash[sectionID],
        'SectionID appears more than once: ' + sectionID
      );
      prevRowsHash[sectionID] = keyedDictionaryFromArray(prevRowIDs[ii]);
    }

    // compare the 2 identity array and get the dirtied rows
    this._dirtySections = [];
    this._dirtyRows = [];

    var dirty;
    for (var sIndex = 0; sIndex < this.sectionIdentities.length; sIndex++) {
      var sectionID = this.sectionIdentities[sIndex];
      // dirty if the sectionHeader is new or _sectionHasChanged is true
      dirty = !prevSectionsHash[sectionID];
      var sectionHeaderHasChanged = this._sectionHeaderHasChanged;
      if (!dirty && sectionHeaderHasChanged) {
        dirty = sectionHeaderHasChanged(
          this._getSectionHeaderData(prevDataBlob, sectionID),
          this._getSectionHeaderData(this._dataBlob, sectionID)
        );
      }
      this._dirtySections.push(!!dirty);

      this._dirtyRows[sIndex] = [];
      for (var rIndex = 0; rIndex < this.rowIdentities[sIndex].length; rIndex++) {
        var rowID = this.rowIdentities[sIndex][rIndex];
        // dirty if the section is new, row is new or _rowHasChanged is true
        dirty =
          !prevSectionsHash[sectionID] ||
          !prevRowsHash[sectionID][rowID] ||
          this._rowHasChanged(
            this._getRowData(prevDataBlob, sectionID, rowID),
            this._getRowData(this._dataBlob, sectionID, rowID)
          );
        this._dirtyRows[sIndex].push(!!dirty);
      }
    }
  }
}

function countRows(allRowIDs) {
  var totalRows = 0;
  for (var sectionIdx = 0; sectionIdx < allRowIDs.length; sectionIdx++) {
    var rowIDs = allRowIDs[sectionIdx];
    totalRows += rowIDs.length;
  }
  return totalRows;
}

function keyedDictionaryFromArray(arr) {
  if (isEmpty(arr)) {
    return {};
  }
  var result = {};
  for (var ii = 0; ii < arr.length; ii++) {
    var key = arr[ii];
    warning(!result[key], 'Value appears more than once in array: ' + key);
    result[key] = true;
  }
  return result;
}


module.exports = ListViewDataSource;
