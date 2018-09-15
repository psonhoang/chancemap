  var currentFocus = -1;

  $(document).ready(function () {
    $(".type-zone").keyup(function(keyEvent){
        var inputField = this;
        var wordsInput = $(this).val();
        if(keyEvent.keyCode != 38 && keyEvent.keyCode != 40) previewTags(wordsInput, keyEvent, inputField);
        var x = document.getElementById("autocomplete-list");
        if (x) x = x.getElementsByTagName("div");
        if (keyEvent.keyCode == 40) {
          currentFocus++;
          addActive(x);
        } else if (keyEvent.keyCode == 38) {
          currentFocus--;
          addActive(x);
        } else if (keyEvent.keyCode == 13) {
          keyEvent.preventDefault();
          if (currentFocus > -1) {
            if (x) x[currentFocus].click();
          }
        }
    });
  });

  function previewTags(wordsInput, keyEvent, inputField){
    $.ajax({
      url: '/search/preview-tags',
      method: 'POST',
      data: {
        wordsInput: wordsInput
      },
      success: (data) => {
        autocomplete(wordsInput, data, keyEvent, inputField);
      }
    });
  }

// Autocomplete

function autocomplete(wordsInput, arr, keyEvent, inputField) {
  var a, b, i, val = wordsInput;
  closeAllLists();
  if (!val) { return false;}
  else {
    a = document.createElement("DIV");
    a.setAttribute("id", "autocomplete-list");
    a.setAttribute("class", "autocomplete-items");
    a.setAttribute("style", "position: absolute; display: block; max-height: 200px; overflow-y: auto; -ms-overflow-style: -ms-autohiding-scrollbar;");
    inputField.parentNode.appendChild(a);
    for (i = 0; i < arr.length; i++) {
      if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
        b = document.createElement("DIV");
        b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
        b.innerHTML += arr[i].substr(val.length);
        b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
        b.addEventListener("click", function() {
          closeAllLists();
          $("#" + inputField.parentNode.id).tagging('remove', wordsInput);
          $("#" + inputField.parentNode.id).tagging('add', this.getElementsByTagName("input")[0].value);
          //inputField.value = this.getElementsByTagName("input")[0].value;
        });
        a.appendChild(b);
      }
    }
  }
  document.addEventListener("click", function (e) {
      closeAllLists(e.target);
      $("#" + inputField.parentNode.id).tagging('remove', wordsInput);
      currentFocus = -1;
  });
}

function addActive(x) {
  if (!x) return false;
  removeActive(x);
  if (currentFocus >= x.length) currentFocus = 0;
  if (currentFocus < 0) currentFocus = (x.length - 1);
  x[currentFocus].classList.add("autocomplete-active");
}
function removeActive(x) {
  for (var i = 0; i < x.length; i++) {
    x[i].classList.remove("autocomplete-active");
  }
}
function closeAllLists(elmnt) {
  var x = document.getElementsByClassName("autocomplete-items");
  for (var i = 0; i < x.length; i++) {
    if (elmnt != x[i]) {
      x[i].parentNode.removeChild(x[i]);
    }
  }
}