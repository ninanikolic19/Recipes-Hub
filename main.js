var recipes = [];
var categories = [];
var difficulties = [];
let currentPage = 1;
let filteredRecipes = [];

const PER_PAGE = 6;
const FAVORITES_KEY = 'favorite';

let url = window.location.pathname;

$(document).ready(function() {
    ajaxCall("navigation", renderNavigation);

    if (url.includes("recipes.html") || url.includes('favorites.html')) {
        ajaxCall("categories", function(data) {
            categories = data;
            renderCategories();

            ajaxCall("difficulties", function(data) {
                difficulties = data;
                renderDifficulties();

                ajaxCall("recipes", function(resData) {
                    recipes = resData;
                    applyFilters();

                    if (url.includes('favorites.html')) {
                        getFavorites();
                    }
                });
            });
        });
    }

    if (url === '/' || url.includes('index.html')) {
        ajaxCall("features", renderFeatures);
        
        ajaxCall("categories", function(data) {
            categories = data;
            renderCategories();

                ajaxCall("difficulties", function(data) {
                difficulties = data;
                renderDifficulties();

                ajaxCall("recipes", function(resData) {
                    recipes = getLatestRecipes(resData);
                    recipesHtml(recipes);
                });
            });
        });
    }

    renderFooter();
});

function ajaxCall(fileName, callback) {
    $.ajax({
        url: "assets/data/" + fileName + ".json",
        method: "GET",
        success: function(data) {
            try {
                callback(data);
            } catch (error) {
                toastr.error("Display error occurred.");
            }
        },
        error: function(xhr, exception) {
            let message = '';
            let errorStatus = xhr.status
            if (errorStatus === 0) {
                message = "No connection";
            } else if (errorStatus === 404) {
                message = "Not Found";
            } else if (errorStatus === 500) {
                message = "Server error";
            } else if (exception === 'parsererror') {
                message = "Parse error";
            } else {
                message = "Error";
            }


            toastr.error(message);
        }
    });
}

function getLatestRecipes(data){
    try{
        let sorted = data.sort(function(a,b){
            return new Date(b.date_created) - new Date(a.date_created);
        });

        return sorted.slice(0,4);
    }
    catch(error){
        toastr.error("Something went wrong");
        return [];
    }
}

function applyFilters() {
    let dataToShow = [...recipes];

    if (url.includes("favorites.html")) {
        getFavorites();
        return;
    }

    let searchKey = $("#search").val().trim();
    let allCategories = document.getElementsByName("filterCategory");
    let sort = $("#sortingDll").val();
    let filterDifficulty = $('.difficultyRadio:checked').val();

    let checkedCategories = [];

    allCategories.forEach(element => {
        if (element.checked) {
            checkedCategories.push(Number(element.value));
        }
    });


    if (searchKey) {
        dataToShow = dataToShow.filter(el => {
            return el.title.toLowerCase().includes(searchKey.toLowerCase());

        });
    }

    if (checkedCategories.length > 0) {
        dataToShow = dataToShow.filter(el => {
            return checkedCategories.includes(el.category_id);
        });
    }


    if (filterDifficulty) {
        dataToShow = dataToShow.filter(el => {
            return getDifficultyLevel(el.difficulty_id).level == Number(filterDifficulty);
        })
    }

    if (sort) {
        dataToShow.sort(function(a, b) {
            if (sort === 'name-asc') {
                return a.title.localeCompare(b.title);
            }
            if (sort === 'name-desc') {
                return b.title.localeCompare(a.title);
            }
            if (sort === 'hardest-first') {
                return getDifficultyLevel(b.difficulty_id).level - getDifficultyLevel(a.difficulty_id).level
            }
            if (sort === 'easiest-first') {
                return getDifficultyLevel(a.difficulty_id).level - getDifficultyLevel(b.difficulty_id).level
            }
            if (sort === 'highest-rate') {
                return b.rating - a.rating;
            }
            if (sort === 'latest') {
                return new Date(b.date_created) - new Date(a.date_created);
            }
            if (sort === 'fastest') {
                return a.time - b.time;
            }
        });
    }

    if (dataToShow.length === 0) {
        $('#recipes').html('<h2>No Recipes For Given Criteria</h2>');
        $("#paginationContainer").html("");
        return;
    }

    let numberOfPages = Math.max(1, Math.ceil(dataToShow.length / PER_PAGE));

    if (currentPage > numberOfPages) {
        currentPage = 1;
    }

    filteredRecipes = dataToShow;

    renderPagination(numberOfPages);
    renderRecipes();
}

function renderPagination(numberOfPages) {
    let print = '';

    let active = currentPage;

    if (numberOfPages === 1) {
        $("#paginationContainer").html("");
        return;
    }
    print += `<ul id="pagination">`
    for (let i = 1; i <= numberOfPages; i++) {
        print += `<li><a href="#" class="pageLink`

        if (i === active) {
            print += ' active';
        }

        print += `" data-page="${i}">${i}</a></li>`
    }
    print += `</ul>`;

    $("#paginationContainer").html(print);

    $('.pageLink').click(changePage);
}

function changePage(e) {
    e.preventDefault();

    $('.pageLink').removeClass('active');
    $(this).addClass('active');

    currentPage = parseInt($(this).data('page'));

    renderRecipes();
}

function renderRecipes() {

    let startIndex = (currentPage - 1) * PER_PAGE;
    let endIndex = startIndex + PER_PAGE;
    let filteredData = filteredRecipes.slice(startIndex, endIndex);

    recipesHtml(filteredData);

}
function recipesHtml(data){
    let print = '';

    data.forEach(element => {
            print += `<div class="recipeCard">
                        <div class="image-container">
                        ${getRibbon(element.date_created)}
                            <img src="assets/images/${element.image}" alt="${element.title}" class="recipe-image"/>
                        </div>
                        <div class="recipeInfo">
                            <h3 class="recipe-title">${element.title}</h3>
                            <p class="recipe-category">Category: ${getCategory(element.category_id)}</p>
                            <p class="recipe-time">Preparation Time: ${element.time} min</p>
                            <p class="recipe-rating">Rating: ${element.rating} 
                                <span class="material-symbols-outlined">
                                    kid_star
                                </span>
                            </p>
                            <div class="cardFooter">
                                ${getFavoritesLinks(element.id)}
                                <div id="recipeDifficulty">${renderDifficulty(element.difficulty_id)}</div>
                            </div>
                            
                        </div>
                    </div>`;
        });

        $("#recipes").html(print);

        $(".toggleFavorites").on('click', toggleFavorite);
}

function getCategory(categoriId) {
    let recipeCategory = categories.find(el => {
        return el.id === categoriId;
    });

    return recipeCategory.name;
}

function getDifficultyLevel(elementDifficultyId) {
    let elementDifficulity = difficulties.find(el => {
        return el.id === elementDifficultyId;
    });
    return elementDifficulity;
}

function renderDifficulty(difficultyId) {
    let recipeDifficulty = getDifficultyLevel(difficultyId);
    let print = '<span>Difficulty: </span>';

    for (let i = 1; i <= difficulties.length; i++) {
        if (i <= recipeDifficulty.level) {
            print += `<div style="background-color: ${recipeDifficulty.color}; height: ${i*10}px;">
        
                </div>`;
        } else {
            print += `<div class="difficultyGray" style="height: ${i*10}px">
        
                </div>`;
        }
    }

    return print;
}

function getFavoritesLinks(recipeId) {
    let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];

    if (favorites.includes(recipeId)) {
        return `<a href="#" data-id="${recipeId}" class="toggleFavorites"> 
                    <span class="material-symbols-outlined heartIcon">
                        heart_check
                    </span>
                </a>`;
    } else {
        return `<a href="#" data-id="${recipeId}" class="toggleFavorites"> 
                    <span class="material-symbols-outlined heartIcon">
                        favorite
                    </span>
                </a>`;
    }
}

function toggleFavorite(e) {
    e.preventDefault();
    let favorites = [];

    try{
        favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY)) ;
        let clickedId = Number(this.dataset.id);

        if (favorites.includes(clickedId)) {
            favorites = favorites.filter(element => {
                return element != clickedId;
            });
            $(this).find('span').html('favorite');
            toastr.success('Recipe removed from favorites');
        } else {
            favorites.push(clickedId);
            $(this).find('span').html('heart_check');
            toastr.success('Recipe added to favorites');
        }

        localStorage.setItem('favorite', JSON.stringify(favorites));
    }
    catch(error){
        toastr.error("Something went wrong");
    }

}

$("#search").keyup(applyFilters);
$("#sortingDll").change(applyFilters);

function renderCategories() {
    let print = '';

    categories.forEach(element => {
        print += `<label>
                    <input type="checkbox" name="filterCategory" value="${element.id}" class="filterCategory"/> 
                    <span>${element.name}</span>
                </label>`;
    });

    $("#categoriesFilter").html(print);

    $(".filterCategory").change(applyFilters);

}

function renderDifficulties() {
    let print = '';
    print += `<label class="radio-label">
                <input type="radio" name="difficulty" value="" class="difficultyRadio"/> 
                All
            </label>`
    difficulties.forEach(el => {
        print += `
            <label class="radio-label">
                <input type="radio" name="difficulty" value="${el.id}" class="difficultyRadio"/> 
                ${el.name}
            </label>`;
    });

    $("#difficultiesContainer").html(print);

    $('.difficultyRadio').change(applyFilters);
}

function getRibbon(dateCreated) {
    let print = '';
    let now = new Date();
    let recipeDate = new Date(dateCreated);

    let dateDifference = (now - recipeDate) / (1000 * 60 * 60 * 24);

    if (dateDifference <= 10) {
        print += `<div class="recipe-ribbon">New</div>`;
    }

    return print;

}

function renderNavigation(naviation) {
    let print = `<div class="navContainer">
                    <a href="index.html" class="navLogo">
                        <span class="material-symbols-outlined">restaurant</span>
                        Recipes<span>Hub</span>
                    </a>
                    
                    <ul id="navLinks">`
    naviation.forEach(el => {
        print += `<li><a href="${el.link}"`

        if (url.includes(el.link)) {
            print += `class='activeLink'`;
        }

        print += `>${el.text}</a></li>`;
    });
    `</ul>
                </div>`;



    $("nav").html(print);
}

function getFavorites() {
    let favoriteIds = [];

    try{
        favoriteIds = JSON.parse(localStorage.getItem(FAVORITES_KEY));

        if (favoriteIds.length === 0) {

            $('tbody').html(`<tr>
                            <td colspan=5>No data</td>
                        </tr>`);
            return;
        }

        let favoriteRecipes = recipes.filter(el => favoriteIds.includes(el.id));

        let print = '';
        favoriteRecipes.forEach(element => {
            print += `<tr>
                                    <td class="tableImage">
                                        <img src="assets/images/${element.image}" alt="${element.title}"/>
                                    </td>
                                    <td>${element.title}</td>
                                    <td>${element.time} min</td>
                                    <td class="ratingCell">${element.rating}</td>
                                    <td><a class="btnRemove" data-id="${element.id}">Remove</button></a>
                                </tr>`
        });

        $('tbody').html(print);

        $(".btnRemove").on('click', removeFavorite);
    }
    catch(error){
        toastr.error("Something went wrong");
        return;
    }
}


function removeFavorite(e) {
    e.preventDefault();

    try{
        let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY));
        let clickedId = Number(this.dataset.id);

        favorites = favorites.filter(element => {
            return element != clickedId;
        });

        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));

        $(this).parent().parent().remove();

        if (favorites.length === 0) {
            $('tbody').html(`<tr>
                            <td colspan=5>No data</td>
                        </tr>`);
        }

        toastr.success('Recipe removed');
    }
    catch(error){
        toastr.error("Something went wrong");
        return;
    }

}

$("#btnReset").click(function() {

    $('#search').val('');
    document.getElementById('sortingDll').selectedIndex = 0;
    $('.filterCategory').prop('checked', false);
    $('.difficultyRadio').prop('checked', false);
    currentPage = 1;
    applyFilters();
})

function renderFeatures(data) {
    let print = '';

    data.forEach(el => {
        print += `<div class="featureCard">
                        <span class="material-symbols-outlined">${el.icon}</span>
                        <h3>${el.title}</h3>
                        <p>${el.description}</p>
                    </div>`;
    });

    $('#featuresGrid').html(print);
}

function renderFooter() {
    let print = `
        <div class="footerContainer">
            <div class="footerSection brandBox">
                <a href="index.html" class="footerLogo">
                    <span class="material-symbols-outlined">restaurant</span>
                    Recipes<span>Hub</span>
                </a>
                <p>Bringing joy to your kitchen with curated recipes, professional tips, and a passionate culinary community.</p>
            </div>

            <div class="footerSection contactBox">
                <h3>Get in Touch</h3>
                <div class="contactItem">
                    <span class="material-symbols-outlined">mail</span>
                    <p>support@recipeshub.com</p>
                </div>
                <div class="contactItem">
                    <span class="material-symbols-outlined">location_on</span>
                    <p>Belgrade, Serbia</p>
                </div>
            </div>

            <div class="footerSection socialBox">
                <h3>Follow Our Journey</h3>
                <div class="socialIcons">
                    <a href="https://instagram.com" target="_blank" title="Instagram">
                        <span class="material-symbols-outlined">photo_camera</span>
                    </a>
                    <a href="https://facebook.com" target="_blank" title="Facebook">
                        <span class="material-symbols-outlined">public</span>
                    </a>
                    <a href="documentation.pdf" target="_blank" title="Documentation">
                        <span class="material-symbols-outlined">description</span>
                    </a>
                </div>
            </div>
        </div>

        <div class="footerBottom">
            <p>&copy; 2026 RecipesHub. All rights reserved.</p>
        </div>`;

    $("footer").html(print);
}

function validateInput(input,regExpression){
    let br=0;
    if(!regExpression.test(input.val().trim())){
        input.parent().find('.errorMsg').show();
        br++;
    }
    else{
        input.parent().find('.errorMsg').hide();
    }

    return br;
}

$("#btnSubmit").click(function(){
    let firstName = $("#firstName");
    let lastName = $("#lastName");
    let email = $("#email");
    let subject = $("#subject");
    let message = $("#message");

    const regFirstName =  /^[A-ZŠĐŽČĆ][a-zšđžčć]{2,15}$/;
    const regLastName = /^[A-ZŠĐŽČĆ][a-zšđžčć]{2,20}$/;
    const regEmail = /^\w[.\d\w]*\@[a-z]{2,10}(\.[a-z]{2,3})+$/;

    let errors = 0;

    errors+= validateInput(firstName,regFirstName);
    errors+= validateInput(lastName,regLastName);
    errors+= validateInput(email,regEmail);

    if(subject.prop("selectedIndex")==0){
        subject.parent().find('.errorMsg').show();
        errors++;
    }
    else{
        subject.parent().find('.errorMsg').hide();
    }


    if(message.val().trim().split(' ').length < 10){
        message.parent().find('.errorMsg').show();
        errors++;
    }
    else{
        message.parent().find('.errorMsg').hide();
    }


    if(errors!=0){
        toastr.error("Something is not filled correctly");
    }
    else{
        toastr.success("Form submitted successfully");
        $("input").val("");
        $("textarea").val("");
        subject.prop("selectedIndex",0);
    }
});
