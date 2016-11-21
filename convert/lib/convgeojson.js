/**
 * 設定
 */
var _setting = {};

// 保育園データの座標列
_setting.nurseryFacilities = {
  lat: 'Y', // 緯度
  lng: 'X'  // 経度
};

/**
 * 市区町村コードの取得
 */
var getCityCode = function () {
  var cityCode = document.getElementById('cityCode').value;
  return cityCode;
}

/**
 * データの生成とダウンロード
 * @param  {[type]} geojson  [description]
 * @param  {[type]} fileName [description]
 * @return {[type]}          [description]
 */
var downloadGeoJSON = function (geojson, fileName) {
  // geojsonオブジェクトを文字列に変換
  geojson = JSON.stringify(geojson);

  // データの生成
  var blob = new Blob([geojson], {'type': 'application/json'});

  // ダウンロード
  if (window.navigator.msSaveBlob) {
    window.navigator.msSaveBlob(blob, fileName);
  } else {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * ファイルの読み込み
 * @param  {[type]} file [description]
 * @return {[type]}      [description]
 */
var readFile = function (file) {
  return new Promise (function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function (e) {
      resolve(e.target.result);
    }
    reader.onerror = function (e) {
      reject(e);
    }
    reader.readAsArrayBuffer(file);
  });
}

/**
 * shapeからgeojsonオブジェクトに変換
 */
/**
 * 中学校区域
 * @return {[type]} [description]
 */
var createData_MiddleSchool = function () {
  _setting.cityCode = getCityCode();
  var shpFile = document.getElementById('MiddleSchool_shp').files[0];
  var dbfFile = document.getElementById('MiddleSchool_dbf').files[0];

  if (shpFile && _setting.cityCode) {
    Promise
      .all([shpFile, dbfFile].map(function (file) {
        return readFile(file);
      }))
      .then(function (results) {
        shapefile
          .read(results[0], results[1], {encoding: 'shift_jis'})
          .then(geojson => {
            // 出力するデータのフィルタリング
            geojson.features = geojson.features.filter((feature) => {
              var cityCode = feature.properties.A32_001;
              return cityCode && cityCode.indexOf(_setting.cityCode) === 0;
            });

            downloadGeoJSON(geojson, 'MiddleSchool.geojson');
          })
          .catch(error => console.error(error.stack));
      })
      .catch(function (err) {
        alert(err);
      });
  }
}

/**
 * 小学校区域
 * @return {[type]} [description]
 */
var createData_Elementary = function () {
  _setting.cityCode = getCityCode();
  var shpFile = document.getElementById('Elementary_shp').files[0];
  var dbfFile = document.getElementById('Elementary_dbf').files[0];

  if (shpFile && _setting.cityCode) {
    Promise
      .all([shpFile, dbfFile].map(function (file) {
        return readFile(file);
      }))
      .then(function (results) {
        shapefile
          .read(results[0], results[1], {encoding: 'shift_jis'})
          .then(geojson => {
            // 出力するデータのフィルタリング
            geojson.features = geojson.features.filter((feature) => {
              var cityCode = feature.properties.A27_005;
              return cityCode && cityCode.indexOf(_setting.cityCode) === 0;
            });

            downloadGeoJSON(geojson, 'Elementary.geojson');
          })
          .catch(error => console.error(error.stack));
      })
      .catch(function (err) {
        alert(err);
      });
  }
}

/**
 * 学校のデータ
 * @return {[type]} [description]
 */
var createData_School = function () {
  _setting.cityCode = getCityCode();
  var shpFile = document.getElementById('School_shp').files[0];
  var dbfFile = document.getElementById('School_dbf').files[0];

  if (shpFile && _setting.cityCode) {
    Promise
      .all([shpFile, dbfFile].map(function (file) {
        return readFile(file);
      }))
      .then(function (results) {
        shapefile
          .read(results[0], results[1], {encoding: 'shift_jis'})
          .then(geojson => {
            // 出力するデータのフィルタリング
            var features = geojson.features.filter((feature) => {
              var cityCode = feature.properties.P29_001;
              feature.properties.label = feature.properties.P29_005.replace(/学校$/, '');
              return cityCode && cityCode.indexOf(_setting.cityCode) === 0;
            });

            // 中学校
            geojson.features = features.filter((feature) => {
              return feature.properties.P29_004 === '16002' || feature.properties.P29_004 === '16003';
            });
            downloadGeoJSON(geojson, 'MiddleSchool_loc.geojson');

            // 小学校
            geojson.features = features.filter((feature) => {
              return feature.properties.P29_004 === '16001';
            });
            downloadGeoJSON(geojson, 'Elementary_loc.geojson');
          })
          .catch(error => console.error(error.stack));
      })
      .catch(function (err) {
        alert(err);
      });
  }
}

/**
 * 保育園データの生成
 * @return {[type]} [description]
 */
var createData_nurseryFacilities = function () {
  // CSVファイルの読み込み
  var csvFile = document.getElementById('nurseryFacilities_csv').files[0];

  if (csvFile) {
    // CSVをJSONに変換
    Papa.parse(csvFile, {
      header: true,
      encoding: 'shift_jis',
      skipEmptyLines: true,
      complete: function (results, file) {
        // JSONをGeoJSONに変換
        var geojson = GeoJSON.parse(results.data, {Point: [_setting.nurseryFacilities.lat, _setting.nurseryFacilities.lng]});
        downloadGeoJSON(geojson, 'nurseryFacilities.geojson');
      }
    });
  }
}

/**
 * イベントリスナ
 */
document.getElementById('createData_MiddleSchool').addEventListener('click', createData_MiddleSchool, false);
document.getElementById('createData_Elementary').addEventListener('click', createData_Elementary, false);
document.getElementById('createData_School').addEventListener('click', createData_School, false);
document.getElementById('createData_nurseryFacilities').addEventListener('click', createData_nurseryFacilities, false);
