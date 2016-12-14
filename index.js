var easyimg = require('easyimage');
var fs = require('fs');
var glob = require("glob")
var path = require('path');

var options = {};
var webdriver = require('selenium-webdriver'),
    By = webdriver.By,
    until = webdriver.until;

var driver = new webdriver.Builder()
    .forBrowser('chrome')
    .build();


// options is optional
glob('./in/*.jpg', options, function (error, files) {
  if(error){
    return;
  }

  files.forEach(function(path){

    var width = 4;
    var height = 4;

    imgInfo(path).then((file) =>{

      var fileName = file.name.split('.')[0];

      ratioImage(file, width, height).then(function(image){

        let extension = image.name.split('.').reverse()[0];
        let imageName = image.name.split('.')[0];
        let dist = './temp/' + imageName + '-resized' + '.' + extension;

        resize(image.path, dist, 128 * width, 128 * height).then(function(image){

          createGrid(image, fileName, width, height).then(function(images){

            slackLogin();

            var code = '';

            images.forEach((image, index) => {

              uploadImage(image);

              if(index % width ===  0 && index !== 0){
                code += '\n';
              }
              code += ':' + image.name.split('.')[0] + ':';
            })
            console.log('Your Emoji code!')
            console.log(code);
            console.log('/over')
            driver.quit();
          });

        }, function(error){
          console.log(error);
        });

      }, function(error){
        console.log(error);
      });

    }, function(error){
      console.log(error);
    })
  })
})

function imgInfo(file){
  return new Promise(function(resolve, reject){
    easyimg.info(file).then(function(file) {
      resolve(file);
    }, function (error) {
      reject(error);
    });
  })
}

function resize(src, dst, width, height, gravity = 'Center'){
  return new Promise(function(resolve, reject) {
    easyimg.resize({
      src,
      dst,
      width,
      height,
      gravity
    }).then(function(image){
      resolve(image);
    }, function(error){
      reject(error);
    })
  });
}

function createGrid(file, name, width = 3, height = 3){
  let promises = [];
  let extension = file.type;
  let folder = createEmojiFolder(name);
  let count = 0;
  for(let i = 0; i < height; i++){
    for(let j = 0; j < width; j++){
      count ++;
      let dist = folder +'/'+ name + '-' + count + '.' + extension;
      var prom = crop(file.path, dist, 128, 128, 128 * j, 128 * i, 'NorthWest')
      promises.push(prom);
    }
  }

  return Promise.all(promises);
}

function crop(src, dst, cropwidth, cropheight, x = 0, y = 0, gravity = 'Center'){
  return new Promise(function(resolve, reject){
    easyimg.crop({
      src,
      dst,
      cropwidth,
      cropheight,
      x,
      y,
      gravity
    }).then(function(image) {
      resolve(image);
    }, function(error){
      reject(error);
    });
  })
}

function createEmojiFolder(name){

  let dir = './out/' + name.split('.')[0];

  if (fs.existsSync(dir)){
    fs.readdirSync(dir).forEach(function(file,index){
      var curPath = dir + "/" + file;
      if(fs.lstatSync(curPath).isDirectory()) { // recurse
        deleteFolderRecursive(curPath);
      } else { // delete file
        fs.unlinkSync(curPath);
      }
    });
    fs.rmdirSync(dir);
  }

  fs.mkdirSync(dir);

  return dir;
}

function ratioImage(file, width = 3, height = 3){
  width = Math.floor(width);
  height = Math.floor(height);

  let widthRatio = file.width / width;
  let heightRatio = file.height / height;

  let denominator = 0;

  if(widthRatio > heightRatio ){
    denominator = Math.floor(heightRatio);
  }else{
    denominator = Math.floor(widthRatio);
  }

  let newWidth = denominator * width;
  let newHeight = denominator * height;

  let extension = file.name.split('.').reverse()[0];
  let name = file.name.split('.')[0];

  let cropDst = './temp/' + name + '-' + width + 'x' + height + '.' + extension;

  return crop(file.path, cropDst, newWidth, newHeight);
}

function slackLogin(){
  driver.get('https://YOURDOMAIN.slack.com/admin/emoji');
  driver.findElement(By.name('email')).sendKeys('YOUREMAIL');
  driver.findElement(By.name('password')).sendKeys('YOURPASSWORD');
  driver.findElement(By.id('signin_btn')).click();
}

function uploadImage(file){

  let name = file.name.split('.')[0];

  driver.findElement(By.id('emojiname')).sendKeys(name);
  var imgPath = path.resolve(file.path);
  driver.findElement(By.id('emojiimg')).sendKeys(imgPath);
  driver.findElement(By.xpath('//*[@id="addemoji"]/div[2]/p[4]/input')).click();
}
