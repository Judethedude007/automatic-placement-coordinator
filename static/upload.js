var dropArea = document.getElementById('drop-area');
var fileInput = document.getElementById('fileElem');
var form = document.getElementById('upload-form');

['dragenter', 'dragover'].forEach(eventName => {
  dropArea.addEventListener(eventName, function(e) {
    e.preventDefault(); e.stopPropagation();
    dropArea.classList.add('highlight');
  }, false);
});
['dragleave', 'drop'].forEach(eventName => {
  dropArea.addEventListener(eventName, function(e) {
    e.preventDefault(); e.stopPropagation();
    dropArea.classList.remove('highlight');
  }, false);
});
dropArea.addEventListener('drop', function(e) {
  e.preventDefault(); e.stopPropagation();
  dropArea.classList.remove('highlight');
  var dt = e.dataTransfer;
  var files = dt.files;
  if (files.length) {
    fileInput.files = files;
    form.submit();
  }
});
dropArea.addEventListener('click', function() {
  fileInput.click();
});
fileInput.addEventListener('change', function() {
  if (fileInput.files.length) {
    form.submit();
  }
});
