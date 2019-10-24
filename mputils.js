const API_BASE_URL = 'https://apm.360neighbour.com:8080'

const app = getApp()

const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()

  return [year, month, day].map(formatNumber).join('/') + ' ' + [hour, minute, second].map(formatNumber).join(':')
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : '0' + n
}

const requestData = (path, method, data) => {
  return new Promise(function(resolve, reject) {
    var token = app.globalData.token
    if (token == null) {
      token = wx.getStorageSync('token') ? wx.getStorageSync('token') : ''
    }
    wx.request({
      url: API_BASE_URL + path,
      data: data,
      method: method,
      header: {
        'content-type': 'application/json',
        'token': token
      },
      success: function(res) {
        if (res.data.result || false) {
          resolve(res.data)
        } else {
          var e = new Object();
          if (res.data.errorCode == 30000) {
            //校验token失效
            getNewToken()
            e.errMsg = "登录失效，请刷新重试"
          } else if (res.data.errorCode == 30001) {
            //没有绑定手机号
            bindPhone()
            e.errMsg = "尚未绑定手机号"
          } else {
            e.errMsg = res.data.message || "请求失败"
          }
          reject(e)
        }
      },
      fail: function(e) {
        //e = { errMsg: "request:fail invalid url" }
        e.errMsg = "网络请求失败"
        reject(e)
      }
    })
  })
}

function getNewToken() {
  wx.login({
    success(res) {
      if (res.code) {
        wx.setStorage({
          key: 'code',
          data: res.code,
        })
        var userInfo = wx.getStorageSync('userInfo') ? wx.getStorageSync('userInfo') : null
        var data = {
          code: res.code,
          userInfo: userInfo
        }
        requestData('/auth/we_chat', 'POST', data).then(res => {
          console.log(res)
          var phone = res.data.phone
          var token = res.data.token ? res.data.token : null
          //存储token
          wx.setStorage({
            key: 'token',
            data: token,
          })
          wx.setStorage({
            key: 'phone',
            data: phone,
          })
          app.globalData.token = token
          app.globalData.phone = phone
        })
      } else {

        console.log('登录失败！' + res.errMsg)
      }
    }
  })
}

function bindPhone() {
  var pages = getCurrentPages()
  var currentPage = pages[pages.length - 1]
  if (currentPage.route == '/pages/me/login/bindPhone/bindPhone') {
    return
  }
  wx.navigateTo({
    url: '/pages/me/login/bindPhone/bindPhone',
  })
}

const uploadImage = (path, data) => {
  return new Promise(function(resolve, reject) {
    wx.uploadFile({
      url: API_BASE_URL + '/file/uploadthumbCompress',
      filePath: data,
      name: 'file',
      success: function(res) {
        if (res.data.result || false) {
          resolve(res.data)
        } else {
          var e = new Object();
          e.errMsg = res.data.message || "请求失败";
          reject(e)
        }
      },
      fail: function(e) {
        reject(e)
      }
    })
  })
}

/**
 * 将本地图片文件地址数组变为上传后的在线图片url数组
 * @param array filePaths
 */
const uploadImageFiles = (imagesFiles = []) => {
  // 上传的后端url
  const url = API_BASE_URL + '/file/uploadthumbCompress'
  // 因为多张图片且数量不定，这里遍历生成一个promiseList
  let promiseList = imagesFiles.map((item) => {
    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: url,
        filePath: item,
        name: 'file',
        success: res => {
          resolve(JSON.parse(res.data));
        },
        fail: err => {
          reject(err)
        }
      });
    });
  });
  // 使用Primise.all来执行promiseList
  return new Promise((resolve, reject) => {
    Promise.all(promiseList).then((res) => {
      // 返回的res是个数据，对应promiseList中请求的结果，顺序与promiseList相同
      /* eg: [
        {
          "result":true,
          "data":
            {
              "id":"","url":"",
              "thumb_1":"",
              "thumb_2":""
            },
          "message":"请求成功"
        },{
          "result":true,
          "data":
            {
              "id":"","url":"",
              "thumb_1":"",
              "thumb_2":""
            },
          "message":"请求成功"
        }
       */
      // 在这里也就是在线图片的url数组了
      // console(res);
      var resultArr = res.map(function(result) {
        return result.data.id
      })
      var resultStr = resultArr.join(',')
      resolve(resultStr)
    }).catch((error) => {
      reject(error);
    });
  })
};


function getData(path, data) {
  return requestData(path, 'GET', data)
}

function postData(path, data) {
  return requestData(path, 'POST', data)
}

function converToQQMap(lng, lat) {
  if (lng == '' && lat == '') {
    return {
      lng: '',
      lat: ''
    }
  }
  var x_pi = 3.14159265358979324 * 3000.0 / 180.0
  var x = lng - 0.0065
  var y = lat - 0.006
  var z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * x_pi)
  var theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * x_pi)
  var qqlng = z * Math.cos(theta)
  var qqlat = z * Math.sin(theta)
  return {
    lng: qqlng,
    lat: qqlat
  }
}

module.exports = {
  formatTime: formatTime,
  GET: getData,
  POST: postData,
  UPLOAD: uploadImage,
  UPLOAD_IMAGES: uploadImageFiles,
  LOGIN: getNewToken,
  BIND_PHONE: bindPhone,
  BD09_to_GCJ02: converToQQMap
}












