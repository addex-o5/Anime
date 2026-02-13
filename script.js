const ANILIST_URL = 'https://graphql.anilist.co';
const CONSUMET_URL = 'https://consumet-api-clone.vercel.app'; // Switched to a slightly more stable one found in testing

// Helper to execute GraphQL queries
async function anilistRequest(query, variables = {}) {
    try {
        const response = await fetch(ANILIST_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            body: JSON.stringify({ query, variables })
        });
        return response.json();
    } catch (error) {
        console.error('Anilist error:', error);
        return { data: { Page: { media: [] } } };
    }
}

// Queries
const TRENDING_QUERY = `
query ($page: Int, $perPage: Int) {
  Page (page: $page, perPage: $perPage) {
    media (sort: TRENDING_DESC, type: ANIME) {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
      }
      bannerImage
      description
      episodes
      averageScore
      genres
      seasonYear
      format
    }
  }
}
`;

const POPULAR_QUERY = `
query ($page: Int, $perPage: Int) {
  Page (page: $page, perPage: $perPage) {
    media (sort: POPULAR_DESC, type: ANIME) {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
        large
      }
      description
      episodes
      averageScore
      genres
      seasonYear
      format
    }
  }
}
`;

const SEARCH_QUERY = `
query ($search: String, $page: Int, $perPage: Int) {
  Page (page: $page, perPage: $perPage) {
    media (search: $search, type: ANIME) {
      id
      title {
        romaji
        english
      }
      coverImage {
        extraLarge
      }
      averageScore
      seasonYear
      format
    }
  }
}
`;

// DOM Elements
const trendingGrid = document.getElementById('trendingGrid');
const popularGrid = document.getElementById('popularGrid');
const searchResultsGrid = document.getElementById('searchResultsGrid');
const searchResultsSection = document.getElementById('searchResultsSection');
const heroSection = document.getElementById('heroSection');
const featuredAnime = document.getElementById('featuredAnime');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const animeModal = document.getElementById('animeModal');
const modalContent = document.getElementById('modalContent');
const closeModal = document.getElementById('closeModal');

let currentAnimeId = null;
let currentProvider = 'zoro';

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    fetchTrending();
    fetchPopular();

    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearch);
    }
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch();
        });
    }

    if (closeModal) {
        closeModal.addEventListener('click', () => {
            animeModal.classList.add('hidden');
            document.body.style.overflow = 'auto';
            if (window.art) {
                window.art.destroy();
                window.art = null;
            }
        });
    }
});

async function fetchTrending() {
    const data = await anilistRequest(TRENDING_QUERY, { page: 1, perPage: 10 });
    if (!data || !data.data) return;
    const media = data.data.Page.media;

    if (trendingGrid) renderTrending(media);
    if (featuredAnime) renderFeatured(media[0]);
}

async function fetchPopular() {
    const data = await anilistRequest(POPULAR_QUERY, { page: 1, perPage: 6 });
    if (!data || !data.data) return;
    if (popularGrid) renderPopular(data.data.Page.media);
}

async function handleSearch() {
    const query = searchInput.value.trim();
    if (!query) return;

    if (searchResultsSection) searchResultsSection.classList.remove('hidden');
    if (searchResultsGrid) searchResultsGrid.innerHTML = '<div class="col-span-full text-center py-10"><i class="fas fa-spinner fa-spin text-3xl text-purple-500"></i></div>';

    const data = await anilistRequest(SEARCH_QUERY, { search: query, page: 1, perPage: 15 });
    if (data && data.data) renderSearchResults(data.data.Page.media);

    if (searchResultsSection) searchResultsSection.scrollIntoView({ behavior: 'smooth' });
}

// Rendering Functions
function renderTrending(media) {
    trendingGrid.innerHTML = media.map(item => createAnimeCard(item)).join('');
}

function renderPopular(media) {
    popularGrid.innerHTML = media.map(item => createPopularCard(item)).join('');
}

function renderSearchResults(media) {
    if (!media || media.length === 0) {
        searchResultsGrid.innerHTML = '<div class="col-span-full text-center py-10">No results found.</div>';
        return;
    }
    searchResultsGrid.innerHTML = media.map(item => createAnimeCard(item)).join('');
}

function createAnimeCard(item) {
    const title = item.title.english || item.title.romaji;
    return `
        <div class="anime-card group cursor-pointer" onclick="showDetail(${item.id})">
            <div class="relative overflow-hidden rounded-lg">
                <img src="${item.coverImage.extraLarge}" alt="${title}" class="w-full h-48 md:h-64 object-cover transition-transform duration-500 group-hover:scale-110">
                <div class="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    <div class="flex space-x-2 mb-2">
                        ${item.genres ? item.genres.slice(0, 2).map(g => `<span class="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded">${g}</span>`).join('') : ''}
                    </div>
                    <div class="flex justify-between items-center">
                        <span class="text-white text-xs">${item.episodes ? item.episodes + ' Eps' : (item.format || 'TV')}</span>
                        <span class="text-yellow-400 text-xs">
                            <i class="fas fa-star"></i> ${item.averageScore ? (item.averageScore / 10).toFixed(1) : 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
            <h3 class="text-white mt-2 text-sm font-medium truncate">${title}</h3>
            <p class="text-gray-400 text-[10px]">${item.seasonYear || ''} • ${item.format || ''}</p>
        </div>
    `;
}

function createPopularCard(item) {
    const title = item.title.english || item.title.romaji;
    return `
        <div class="anime-card group flex bg-gray-900 rounded-lg overflow-hidden cursor-pointer hover:bg-gray-800 transition-colors" onclick="showDetail(${item.id})">
            <div class="w-1/3 relative">
                <img src="${item.coverImage.extraLarge}" alt="${title}" class="w-full h-full object-cover">
            </div>
            <div class="w-2/3 p-4">
                <h3 class="text-white font-bold text-lg mb-1 truncate">${title}</h3>
                <div class="flex items-center mb-2">
                    <span class="text-yellow-400 text-sm mr-2">
                        <i class="fas fa-star"></i> ${item.averageScore ? (item.averageScore / 10).toFixed(1) : 'N/A'}
                    </span>
                    <span class="text-gray-400 text-xs">${item.seasonYear || ''} • ${item.format || ''}</span>
                </div>
                <p class="text-gray-300 text-xs mb-3 line-clamp-3">
                    ${item.description ? item.description.replace(/<[^>]*>?/gm, '') : 'No description available.'}
                </p>
                <div class="flex flex-wrap gap-1">
                    ${item.genres ? item.genres.slice(0, 3).map(g => `<span class="bg-purple-600 text-white text-[10px] px-2 py-0.5 rounded">${g}</span>`).join('') : ''}
                </div>
            </div>
        </div>
    `;
}

function renderFeatured(item) {
    if (!item) return;
    const title = item.title.english || item.title.romaji;
    featuredAnime.innerHTML = `
        <div class="md:w-1/2 mb-10 md:mb-0">
            <h1 class="hero-text futuristic-font text-4xl md:text-5xl font-bold mb-6 neon-text-blue">
                ${title.toUpperCase()}
            </h1>
            <p class="text-gray-300 mb-8 text-lg max-w-lg line-clamp-4">
                ${item.description ? item.description.replace(/<[^>]*>?/gm, '') : ''}
            </p>
            <div class="flex space-x-4">
                <button onclick="showDetail(${item.id})" class="bg-gradient-to-r from-purple-600 to-blue-500 text-white px-6 py-3 rounded-full hover:opacity-90 transition-opacity font-medium flex items-center shadow-lg shadow-purple-500/20">
                    <i class="fas fa-play mr-2"></i> Watch Now
                </button>
            </div>
        </div>
        <div class="md:w-1/2 flex justify-center">
            <div class="relative w-full max-w-md">
                <div class="absolute -inset-4 bg-gradient-to-r from-purple-600 to-blue-500 rounded-2xl opacity-70 blur-lg"></div>
                <div class="relative bg-gray-900 rounded-xl overflow-hidden cursor-pointer" onclick="showDetail(${item.id})">
                    <img src="${item.bannerImage || item.coverImage.extraLarge}" alt="${title}" class="w-full h-auto object-cover min-h-[300px]">
                    <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-4">
                        <div class="flex justify-between items-end">
                            <div>
                                <h3 class="text-white font-bold text-lg">${title}</h3>
                                <p class="text-gray-300 text-sm">${item.format || ''} • ${item.seasonYear || ''}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Detail View
window.showDetail = async function(id) {
    animeModal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    modalContent.innerHTML = '<div class="text-center py-20"><i class="fas fa-spinner fa-spin text-5xl text-purple-500"></i></div>';

    const query = `
    query ($id: Int) {
      Media (id: $id) {
        id
        title {
          romaji
          english
          native
        }
        coverImage {
          extraLarge
        }
        bannerImage
        description
        episodes
        averageScore
        genres
        status
        seasonYear
        format
      }
    }
    `;

    const data = await anilistRequest(query, { id });
    const item = data.data.Media;
    renderModalContent(item);
};

function renderModalContent(item) {
    const title = item.title.english || item.title.romaji;
    modalContent.innerHTML = `
        <div class="flex flex-col lg:flex-row gap-8">
            <div class="lg:w-1/4">
                <img src="${item.coverImage.extraLarge}" class="w-full rounded-lg shadow-2xl border border-purple-500">
                <div class="mt-4 space-y-2">
                    <p><span class="text-purple-400 font-bold">Status:</span> ${item.status}</p>
                    <p><span class="text-purple-400 font-bold">Episodes:</span> ${item.episodes || 'Unknown'}</p>
                    <p><span class="text-purple-400 font-bold">Score:</span> ${item.averageScore ? (item.averageScore / 10).toFixed(1) : 'N/A'}</p>
                    <p><span class="text-purple-400 font-bold">Year:</span> ${item.seasonYear || 'N/A'}</p>
                </div>
            </div>
            <div class="lg:w-3/4">
                <h1 class="text-4xl font-bold futuristic-font neon-text-blue mb-2">${title}</h1>
                <h2 class="text-xl text-gray-400 mb-4">${item.title.native || ''}</h2>
                <div class="flex flex-wrap gap-2 mb-6">
                    ${item.genres.map(g => `<span class="bg-gray-800 text-purple-300 px-3 py-1 rounded-full text-sm border border-purple-900">${g}</span>`).join('')}
                </div>
                <div class="text-gray-300 text-lg mb-8 leading-relaxed max-h-48 overflow-y-auto pr-4">
                    ${item.description ? item.description.replace(/<[^>]*>?/gm, '') : 'No description available.'}
                </div>

                <div id="player-section" class="hidden mb-10">
                    <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
                        <h3 class="text-2xl font-bold neon-text-purple">Watching Episode <span id="current-ep-num">1</span></h3>
                        <div id="download-btn-container"></div>
                    </div>
                    <div id="player-container" class="w-full aspect-video bg-black rounded-lg overflow-hidden mb-4 shadow-neon-blue border border-purple-500/30"></div>
                    <div id="quality-selector" class="flex flex-wrap gap-2 mb-4"></div>
                </div>

                <div id="episode-list-section">
                    <div class="flex justify-between items-center mb-4">
                        <h3 class="text-2xl font-bold neon-text-purple">Episodes</h3>
                        <select id="provider-select" onchange="changeProvider(this.value)" class="bg-gray-800 text-white px-3 py-1 rounded-lg border border-purple-500 outline-none focus:ring-2 focus:ring-purple-400">
                            <option value="zoro" ${currentProvider === 'zoro' ? 'selected' : ''}>HiAnime (Zoro)</option>
                            <option value="gogoanime" ${currentProvider === 'gogoanime' ? 'selected' : ''}>Gogoanime</option>
                        </select>
                    </div>
                    <div id="episode-grid" class="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                        <div class="col-span-full py-4 text-center">
                            <i class="fas fa-spinner fa-spin mr-2"></i> Loading episodes...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    fetchEpisodes(title);
}

// Consumet API Helpers
async function consumetRequest(endpoint, params = {}) {
    let url = `${CONSUMET_URL}/anime/${currentProvider}/${endpoint}`;
    if (Object.keys(params).length > 0) {
        const query = new URLSearchParams(params).toString();
        url += (url.includes('?') ? '&' : '?') + query;
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`Provider error: ${res.status}`);
    const data = await res.json();

    if (data.message && typeof data.message === 'string' && data.message.includes('not found')) {
         throw new Error(data.message);
    }
    return data;
}

async function fetchEpisodes(title) {
    const episodeGrid = document.getElementById('episode-grid');
    try {
        // Step 1: Search
        const searchData = await consumetRequest(encodeURIComponent(title));

        if (!searchData.results || searchData.results.length === 0) {
            episodeGrid.innerHTML = `<div class="col-span-full py-4 text-center">No results found for "${title}" on ${currentProvider}. Try switching providers.</div>`;
            return;
        }

        const animeId = searchData.results[0].id;

        // Step 2: Info
        let infoData;
        if (currentProvider === 'zoro') {
            infoData = await consumetRequest('info', { id: animeId });
        } else {
            infoData = await consumetRequest(`info/${animeId}`);
        }

        if (!infoData.episodes || infoData.episodes.length === 0) {
            episodeGrid.innerHTML = '<div class="col-span-full py-4 text-center">No episodes found for this selection.</div>';
            return;
        }

        // Step 3: Render
        episodeGrid.innerHTML = infoData.episodes.map(ep => `
            <button onclick="watchEpisode('${ep.id}', ${ep.number})" class="episode-btn bg-gray-800 hover:bg-purple-600 text-white font-bold py-2 rounded transition-all border border-gray-700 hover:border-purple-400">
                ${ep.number}
            </button>
        `).join('');

    } catch (error) {
        console.error('Fetch episodes error:', error);
        episodeGrid.innerHTML = `<div class="col-span-full py-4 text-center text-gray-400">
            <p>Could not load episodes from ${currentProvider}.</p>
            <p class="text-xs mt-2 text-purple-400">Try switching the provider dropdown above.</p>
        </div>`;
    }
}

window.changeProvider = function(val) {
    currentProvider = val;
    const title = document.querySelector('h1').innerText;
    document.getElementById('episode-grid').innerHTML = '<div class="col-span-full py-4 text-center"><i class="fas fa-spinner fa-spin mr-2"></i> Switching provider...</div>';
    fetchEpisodes(title);
};

window.watchEpisode = async function(episodeId, epNum) {
    const playerSection = document.getElementById('player-section');
    const currentEpNum = document.getElementById('current-ep-num');
    const container = document.getElementById('player-container');
    const downloadBtnContainer = document.getElementById('download-btn-container');
    const qualitySelector = document.getElementById('quality-selector');

    playerSection.classList.remove('hidden');
    currentEpNum.innerText = epNum;
    playerSection.scrollIntoView({ behavior: 'smooth' });

    container.innerHTML = '<div class="flex items-center justify-center h-full"><i class="fas fa-spinner fa-spin text-4xl text-purple-500"></i></div>';
    downloadBtnContainer.innerHTML = '';
    qualitySelector.innerHTML = '';

    try {
        let watchData;
        if (currentProvider === 'zoro') {
            watchData = await consumetRequest('watch', { episodeId });
        } else {
            watchData = await consumetRequest(`watch/${episodeId}`);
        }

        if (!watchData.sources || watchData.sources.length === 0) {
            container.innerHTML = '<div class="flex flex-col items-center justify-center h-full text-red-400 p-4 text-center"><i class="fas fa-exclamation-circle text-2xl mb-2"></i> No stream sources found. The provider might be down.</div>';
            showDownloadFallback();
            return;
        }

        const defaultSource = watchData.sources.find(s => s.quality === 'default') || watchData.sources[0];
        initArtPlayer(defaultSource.url);

        // Quality Selector
        watchData.sources.forEach(source => {
            const btn = document.createElement('button');
            btn.className = 'bg-gray-800 hover:bg-purple-700 text-white text-xs px-3 py-1 rounded border border-gray-700 transition-colors';
            btn.innerText = source.quality;
            btn.onclick = () => {
                if (window.art) window.art.switchUrl(source.url);
            };
            qualitySelector.appendChild(btn);
        });

        // Download Link
        if (watchData.download && watchData.download !== '#') {
            downloadBtnContainer.innerHTML = `
                <a href="${watchData.download}" target="_blank" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-full text-sm flex items-center transition-all shadow-lg hover:shadow-blue-500/50">
                    <i class="fas fa-download mr-2"></i> Download
                </a>
            `;
        } else {
            showDownloadFallback();
        }

    } catch (error) {
        console.error('Watch episode error:', error);
        container.innerHTML = `<div class="flex flex-col items-center justify-center h-full text-gray-400 p-6 text-center">
            <i class="fas fa-exclamation-triangle text-3xl mb-2 text-yellow-500"></i>
            <p>Failed to load video stream.</p>
            <p class="text-xs mt-1">${error.message}</p>
        </div>`;
        showDownloadFallback();
    }
};

function showDownloadFallback() {
    const downloadBtnContainer = document.getElementById('download-btn-container');
    const animeTitle = document.querySelector('h1').innerText;
    const fallbackUrl = `https://animepahe.ru/anime?q=${encodeURIComponent(animeTitle)}`;
    downloadBtnContainer.innerHTML = `
        <a href="${fallbackUrl}" target="_blank" class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-full text-sm flex items-center transition-all shadow-lg hover:shadow-indigo-500/50" title="Search for download on AnimePahe">
            <i class="fas fa-external-link-alt mr-2"></i> Get Download
        </a>
    `;
}

function initArtPlayer(url) {
    if (window.art) {
        window.art.destroy();
    }

    window.art = new Artplayer({
        container: '#player-container',
        url: url,
        type: url.includes('.m3u8') ? 'm3u8' : 'mp4',
        customType: {
            m3u8: function(video, url) {
                if (Hls.isSupported()) {
                    const hls = new Hls();
                    hls.loadSource(url);
                    hls.attachMedia(video);
                    hls.on(Hls.Events.MANIFEST_PARSED, function() {
                        video.play();
                    });
                } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
                    video.src = url;
                }
            }
        },
        setting: true,
        pip: true,
        fullscreen: true,
        fullscreenWeb: true,
        autoplay: true,
        theme: '#9333ea',
        icons: {
            loading: '<i class="fas fa-spinner fa-spin text-3xl"></i>',
        },
    });
}
