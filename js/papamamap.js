/**
 * コンストラクタ
 *
 * @param ol.Map map OpenLayers3 map object
 *
 */
window.Papamamap = function() {
    this.map = null;
    this.centerLatOffsetPixel = 75;
    this.viewCenter = [];
};

/**
 * マップを作成して保持する
 *
 * @param  {[type]} mapServerListItem [description]
 * @return {[type]}                   [description]
 */
Papamamap.prototype.generate = function(mapServerListItem)
{
    this.map = new ol.Map({
        layers: [
            new ol.layer.Tile({
                opacity: 1.0,
                name: 'layerTile',
                source: mapServerListItem.source
            }),
            // 中学校区レイヤーグループ
            new ol.layer.Group({
                layers:[
                    // 中学校区ポリゴン
                    new ol.layer.Vector({
                        source: new ol.source.GeoJSON({
                            projection: 'EPSG:3857',
                            url: 'data/MiddleSchool.geojson'
                        }),
                        name: 'layerMiddleSchool',
                        style: middleSchoolStyleFunction,
                    }),
                    // 中学校区位置
                    new ol.layer.Vector({
                        source: new ol.source.GeoJSON({
                            projection: 'EPSG:3857',
                            url: 'data/MiddleSchool_loc.geojson'
                        }),
                        name: 'layerMiddleSchoolLoc',
                        style: middleSchoolStyleFunction,
                    }),
                ],
                visible: false
            }),
            // 小学校区レイヤーグループ
            new ol.layer.Group({
                layers:[
                     // 小学校区ポリゴン
                     new ol.layer.Vector({
                         source: new ol.source.GeoJSON({
                             projection: 'EPSG:3857',
                             url: 'data/Elementary.geojson'
                         }),
                         name: 'layerElementarySchool',
                         style: elementaryStyleFunction,
                     }),
                     // 小学校区位置
                     new ol.layer.Vector({
                         source: new ol.source.GeoJSON({
                             projection: 'EPSG:3857',
                             url: 'data/Elementary_loc.geojson'
                         }),
                         name: 'layerElementarySchoolLoc',
                         style: elementaryStyleFunction,
                     })
                ],
                visible: false
            }),
            // 距離同心円描画用レイヤー
            new ol.layer.Vector({
                 source: new ol.source.Vector(),
                 name: 'layerCircle',
                 style: circleStyleFunction,
                 visible: true
            }),
        ],
        target: 'map',
        view: new ol.View({
            center: ol.proj.transform(this.viewCenter, 'EPSG:4326', 'EPSG:3857'),
            zoom: 14,
            maxZoom: 18,
            minZoom: 10
        }),
        controls: [
             new ol.control.Attribution({collapsible: true}),
             new ol.control.ScaleLine({}), // 距離ライン定義
             new ol.control.Zoom({}),
             new ol.control.ZoomSlider({}),
             new MoveCurrentLocationControl()
        ]
    });
};

/**
 * 指定した名称のレイヤーの表示・非表示を切り替える
 * @param  {[type]} layerName [description]
 * @param  {[type]} visible   [description]
 * @return {[type]}           [description]
 */
Papamamap.prototype.switchLayer = function(layerName, visible)
{
    this.map.getLayers().forEach(function(layer) {
        if (layer.get('name') == layerName) {
            layer.setVisible(visible);
        }
    });
};

/**
 * 指定した座標にアニメーションしながら移動する
 * isTransform:
 * 座標参照系が変換済みの値を使うには false,
 * 変換前の値を使うには true を指定
 */
Papamamap.prototype.animatedMove = function(lon, lat, isTransform)
{
    // グローバル変数 map から view を取得する
    view = this.map.getView();
    var pan = ol.animation.pan({
        duration: 850,
        source: view.getCenter()
    });
    this.map.beforeRender(pan);
    var coordinate = [lon, lat];
    if(isTransform) {
        // 座標参照系を変換する
        coordinate = ol.proj.transform([lon, lat], 'EPSG:4326', 'EPSG:3857');
    } else {
        // 座標系を変換しない
        // モバイルでポップアップ上部が隠れないように中心をずらす
        var pixel = this.map.getPixelFromCoordinate(coordinate);
        pixel[1] = pixel[1] - this.centerLatOffsetPixel;
        coordinate = this.map.getCoordinateFromPixel(pixel);
    }
    view.setCenter(coordinate);
};


/**
 * 指定したgeojsonデータを元に認可外・認可・幼稚園レイヤーを描写する
 *
 * @param {[type]} facilitiesData [description]
 */
Papamamap.prototype.addNurseryFacilitiesLayer = function(facilitiesData)
{
    if(this.map.getLayers().getLength() >= 4) {
        this.map.removeLayer(this.map.getLayers().item(4));
        this.map.removeLayer(this.map.getLayers().item(4));
        this.map.removeLayer(this.map.getLayers().item(4));
    }

    // 幼稚園
    this.map.addLayer(
        new ol.layer.Vector({
            source: new ol.source.GeoJSON({
                projection: 'EPSG:3857',
                object: facilitiesData
            }),
            name: 'layerKindergarten',
            style: kindergartenStyleFunction
        })
    );
    // 認可外
    this.map.addLayer(
        new ol.layer.Vector({
            source: new ol.source.GeoJSON({
                projection: 'EPSG:3857',
                object: facilitiesData
            }),
            name: 'layerNinkagai',
            style: ninkagaiStyleFunction
        })
    );
    // 認可
    this.map.addLayer(
        new ol.layer.Vector({
            source: new ol.source.GeoJSON({
                projection: 'EPSG:3857',
                object: facilitiesData
            }),
            name: 'layerNinka',
            style: ninkaStyleFunction
        })
    );
};

/**
 * 保育施設データの読み込みを行う
 * @return {[type]} [description]
 */
Papamamap.prototype.loadNurseryFacilitiesJson = function(successFunc)
{
    var d = new $.Deferred();
    $.getJSON(
        "data/nurseryFacilities.geojson",
        function(data) {
            successFunc(data);
            d.resolve();
        }
    ).fail(function(){
        console.log('station data load failed.');
        d.reject('load error.');
    });
    return d.promise();
};

/**
 *
 * @param  {[type]} mapServerListItem [description]
 * @param  {[type]} opacity           [description]
 * @return {[type]}                   [description]
 */
Papamamap.prototype.changeMapServer = function(mapServerListItem, opacity)
{
    this.map.removeLayer(this.map.getLayers().item(0));
    source_type = mapServerListItem.source_type;
    var layer = null;
    switch(source_type) {
        case 'image':
            layer = new ol.layer.Image({
                opacity: opacity,
                source: mapServerListItem.source
            });
            break;
        default:
            layer = new ol.layer.Tile({
                opacity: opacity,
                source: mapServerListItem.source
            });
            break;
    }
    this.map.getLayers().insertAt(0, layer);
};

/**
 * 指定した名前のレイヤー情報を取得する
 * @param  {[type]} layerName [description]
 * @return {[type]}           [description]
 */
Papamamap.prototype.getLayer = function(layerName)
{
    result = null;
    this.map.getLayers().forEach(function(layer) {
        if (layer.get('name') == layerName) {
            result = layer;
        }
    });
    return result;
};

/**
 * 指定した場所に地図の中心を移動する。
 * 指定した場所情報にポリゴンの座標情報を含む場合、ポリゴン外枠に合わせて地図の大きさを変更する
 *
 * @param  {[type]} mapServerListItem [description]
 * @return {[type]}                   [description]
 */
Papamamap.prototype.moveToSelectItem = function(mapServerListItem)
{
    if(mapServerListItem.coordinates !== undefined) {
        // 区の境界線に合わせて画面表示
        components = [];
        for(var i=0; i<mapServerListItem.coordinates.length; i++) {
            coord = mapServerListItem.coordinates[i];
            pt2coo = ol.proj.transform(coord, 'EPSG:4326', 'EPSG:3857');
            components.push(pt2coo);
        }
        components = [components];

        view = this.map.getView();
        polygon = new ol.geom.Polygon(components);
        size =  this.map.getSize();
        var pan = ol.animation.pan({
            duration: 850,
            source: view.getCenter()
        });
        this.map.beforeRender(pan);

        feature = new ol.Feature({
            name: mapServerListItem.name,
            geometry: polygon
        });
        layer = this.getLayer(this.getLayerName("Circle"));
        source = layer.getSource();
        source.clear();
        source.addFeature(feature);

        view.fitGeometry(
            polygon,
            size,
            {
                constrainResolution: false
            }
        );
    } else {
        // 選択座標に移動
        lon = mapServerListItem.lon;
        lat = mapServerListItem.lat;
        if(lon !== undefined && lat !== undefined) {
            this.animatedMove(lon, lat, true);
        }
    }
};

/**
 * [getPopupTitle description]
 * @param  {[type]} feature [description]
 * @return {[type]}         [description]
 */
Papamamap.prototype.getPopupTitle = function(feature)
{
    // タイトル部
    var title = '';
    var type = feature.get('種別') ? feature.get('種別') : feature.get('Type');
    var subtype = feature.get('SubType') ? feature.get('SubType') : type;
    if (type == '認可保育所') {
        title  = '[' + subtype + '] ';
    } else {
        title  = '[' + type + '] ';
    }
    var owner = feature.get('設置') ? feature.get('設置') : feature.get('Ownership');
    if(owner !== undefined && owner !== null && owner !== "") {
        title += ' [' + owner +']';
    }
    var name = feature.get('名称') ? feature.get('名称') : feature.get('Name');
    title += name;
    url = feature.get('url');
    if(url !== null && url !='') {
        title = '<a href="' +url+ '" target="_blank">' + title + '</a>';
    }
    return title;
};

/**
 * [getPopupContent description]
 * @param  {[type]} feature [description]
 * @return {[type]}         [description]
 */
Papamamap.prototype.getPopupContent = function(feature)
{
    var content = '';
    content = '<table><tbody>';

    var type = feature.get('種別') ? feature.get('種別') : feature.get('Type');
    if(type == "認可保育所") {
	    var open  = feature.get('開園時間') ? feature.get('開園時間') : feature.get('Open');
	    var close = feature.get('終園時間') ? feature.get('終園時間') : feature.get('Close');
	    if (open !=  null || close != null ) {
	        content += '<tr>';
	        content += '<th>時間</th>';
	        content += '<td>';
	        content += (open ? open : "") + '〜' + (close ? close : "");
	        content += '</td>';
	        content += '</tr>';
	    }
	}
/**
    var memo = feature.get('備考') ? feature.get('備考') : feature.get('Memo');
    if (memo != null) {
        content += '<tr>';
        content += '<th>備考</th>';
        content += '<td>' + memo + '</td>';
        content += '</tr>';
    }
**/
    var temp    = feature.get('一時') ? feature.get('一時') : feature.get('Temp');
    var holiday = feature.get('休日') ? feature.get('休日') : feature.get('Holiday');
    var night   = feature.get('夜間') ? feature.get('夜間') : feature.get('Night');
    var h24     = feature.get('H24') ? feature.get('H24') : feature.get('H24');

    if( temp === 'Y' || holiday === 'Y' || night === 'Y' || h24 === 'Y') {
        content += '<tr>';
        content += '<th></th>';
        content += '<td>';
        if (temp === 'Y') {
            content += '一時保育 ';
        }
        if (holiday === 'Y') {
            content += '休日保育 ';
        }
        if (night === 'Y') {
            content += '夜間保育 ';
        }
        if (h24 === 'Y') {
            content += '24時間 ';
        }
        content += '</td>';
        content += '</tr>';
    }

    var proof = feature.get('証明') ? feature.get('証明') : feature.get('Proof');
    if(type == "認可外保育所" && proof === 'Y') {
        content += '<tr>';
        content += '<th>監督基準</th>';
        content += '<td>';
        content += '証明書発行済<a href="http://www.hamamatsu-pippi.net/shiritai/hoiku_kyoiku/" target="_blank">(詳細)</a>';
        content += '</td>';
        content += '</tr>';
    }
    var vacancy = feature.get('Vacancy');
    if(type == "認可保育所" && vacancy === 'Y') {
        content += '<tr>';
        content += '<th>欠員</th>';
        content += '<td>';
        content += '<a href="http://www.city.chiba.jp/kodomomirai/kodomomirai/unei/akizyoukyou.html" target="_blank">空きあり</a>';
        var vacancyDate = feature.get('VacancyDate');
        if (vacancyDate != null) {
            content += " (" + vacancyDate + ")";
        }
        content += '</td>';
        content += '</tr>';
    }

    if(type == "認可保育所") {
	    var ageS = feature.get('開始年齢') ? feature.get('開始年齢') : feature.get('AgeS');
	    var ageE = feature.get('終了年齢') ? feature.get('終了年齢') : feature.get('AgeE');
	    if (ageS != null || ageE != null) {
	        content += '<tr>';
	        content += '<th>年齢</th>';
	        content += '<td>' + (ageS ? ageS : "") + '〜' + (ageE ? ageE : "") + '</td>';
	        content += '</tr>';
	    }
	}
    var full = feature.get('定員') ? feature.get('定員') : feature.get('Full');
    if (full != null) {
        content += '<tr>';
        content += '<th>定員</th>';
        content += '<td>' + full + '人</td>';
        content += '</tr>';
    }
    var tel = feature.get('TEL') ? feature.get('TEL') : feature.get('TEL');
    if (tel != null) {
        content += '<tr>';
        content += '<th>TEL</th>';
        content += '<td>' + tel + '</td>';
        content += '</tr>';
    }
/**
    var fax = feature.get('FAX') ? feature.get('FAX') : feature.get('FAX');
    if (fax != null) {
        content += '<tr>';
        content += '<th>FAX</th>';
        content += '<td>' + fax + '</td>';
        content += '</tr>';
    }
**/
    var add1 = feature.get('住所１') ? feature.get('住所１') : feature.get('Add1');
    var add2 = feature.get('住所２') ? feature.get('住所２') : feature.get('Add2');
    if (add1 != null || add2 != null) {
        content += '<tr>';
        content += '<th>住所</th>';
        content += '<td>' + (add1 ? add1 : "") + (add2 ? add2 : "") +'</td>';
        content += '</tr>';
    }
    var owner = feature.get('設置者') ? feature.get('設置者') : feature.get('Owner');
    if (owner != null) {
        content += '<tr>';
        content += '<th>設置者</th>';
        content += '<td>' + owner + '</td>';
        content += '</tr>';
    }
    if(type == "認可保育所") {
        var admitte0 = feature.get('admitte0');
        var entry0 = feature.get('entry0');
        var admitte1 = feature.get('admitte1');
        var entry1 = feature.get('entry1');
        var admitte2 = feature.get('admitte2');
        var entry2 = feature.get('entry2');
        var admitte3 = feature.get('admitte3');
        var entry3 = feature.get('entry3');
        var admitte4 = feature.get('admitte4');
        var entry4 = feature.get('entry4');
        var admitte5 = feature.get('admitte5');
        var entry5 = feature.get('entry5');

        content += '<tr>';
        content += '<th colspan="2">募集人数（申込状況）</th>';
        content += '</tr>';
        content += '</tbody></table>';

        content += '<table class="vborder"><tbody>';
        content += '<tr>';
        content += '<th>0歳</th>';
        content += '<th>1歳</th>';
        content += '<th>2歳</th>';
        content += '<th>3歳</th>';
        content += '<th>4歳</th>';
        content += '<th>5歳</th>';
        content += '</tr>';
        content += '<tr>';
        content += '<td style="text-align: center;">' + admitte0 + '('+ entry0 + ')' + '</td>';
        content += '<td style="text-align: center;">' + admitte1 + '('+ entry1 + ')' + '</td>';
        content += '<td style="text-align: center;">' + admitte2 + '('+ entry2 + ')' + '</td>';
        content += '<td style="text-align: center;">' + admitte3 + '('+ entry3 + ')' + '</td>';
        content += '<td style="text-align: center;">' + admitte4 + '('+ entry4 + ')' + '</td>';
        content += '<td style="text-align: center;">' + admitte5 + '('+ entry5 + ')' + '</td>';
        content += '</tr>';
    }

    content += '</tbody></table>';

    var vacancyDate = feature.get('認可保育所欠員状況取得日') ? feature.get('認可保育所欠員状況取得日') : feature.get('VacancyDate');
    if(vacancyDate != "") {
	    content += '<p style="font-size:12px">更新：' + vacancyDate + '</p>';
	} else {
	    content += '<p style="font-size:12px">更新：－</p>';
	}
    return content;
};

/**
 * 円を消す
 *
 * @param  {[type]} radius      [description]
 * @param  {[type]} moveToPixel [description]
 * @return {[type]}             [description]
 */
Papamamap.prototype.clearCenterCircle = function()
{
    var layer = this.getLayer(this.getLayerName("Circle"));
    var source = layer.getSource();
    source.clear();
};

/**
 * 円を描画する
 *
 * @param  {[type]} radius      [description]
 * @param  {[type]} moveToPixel [description]
 * @return {[type]}             [description]
 */
Papamamap.prototype.drawCenterCircle = function(radius, moveToPixel)
{
    if(moveToPixel === undefined || moveToPixel === null) {
        moveToPixel = 0;
    }
    if(radius === "") {
        radius = 500;
    }

    // 円を消す
    this.clearCenterCircle();

    view  = this.map.getView();
    coordinate = view.getCenter();
    if(moveToPixel > 0) {
        var pixel = map.getPixelFromCoordinate(coordinate);
        pixel[1] = pixel[1] + moveToPixel;
        coordinate = map.getCoordinateFromPixel(pixel);
    }
    // circleFeatures = drawConcentricCircle(coord, radius);

    // 選択した半径の同心円を描く
    radius = Math.floor(radius);

    circleFeatures = [];
    // 中心部の円を描く
    var sphere = new ol.Sphere(6378137); // ol.Sphere.WGS84 ol.js には含まれてない
    coordinate = ol.proj.transform(coordinate, 'EPSG:3857', 'EPSG:4326');

    // 描画する円からextent情報を取得し、円の大きさに合わせ画面の縮尺率を変更
    geoCircle = ol.geom.Polygon.circular(sphere, coordinate, radius);
    geoCircle.transform('EPSG:4326', 'EPSG:3857');
    circleFeature = new ol.Feature({
        geometry: geoCircle
    });
    circleFeatures.push(circleFeature);

    // 大きい円に合わせて extent を設定
    extent = geoCircle.getExtent();
    view   = this.map.getView();
    sizes  = this.map.getSize();
    size   = (sizes[0] < sizes[1]) ? sizes[0] : sizes[1];
    view.fitExtent(extent, [size, size]);

    // 円の内部に施設が含まれるかチェック
    _features = nurseryFacilities.features.filter(function(item,idx){
        coordinate = ol.proj.transform(item.geometry.coordinates, 'EPSG:4326', 'EPSG:3857');
        if(ol.extent.containsCoordinate(extent, coordinate))
            return true;
        });
    for(var i=0; i < _features.length; i++) {
        console.log(_features[i].properties['名称']);
    }
    console.log(_features);

    var layer  = this.getLayer(this.getLayerName("Circle"));
    var source = layer.getSource();
    source.addFeatures(circleFeatures);
    return;
};

/**
 * レイヤー名を取得する
 * @param  {[type]} cbName [description]
 * @return {[type]}        [description]
 */
Papamamap.prototype.getLayerName = function(cbName)
{
    return 'layer' + cbName;
};

/**
 * 指定した名称のレイヤーの表示・非表示を切り替える
 * @param  {[type]} layerName [description]
 * @param  {[type]} visible   [description]
 * @return {[type]}           [description]
 */
Papamamap.prototype.switchLayer = function(layerName, visible) {
    var _layerName = this.getLayerName(layerName.substr(2));
    this.map.getLayers().forEach(function(layer) {
        if (layer.get('name') == _layerName) {
            layer.setVisible(visible);
        }
    });
};
