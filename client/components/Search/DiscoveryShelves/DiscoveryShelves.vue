<template>
    <div class="discovery-wrap q-mx-md q-mt-md q-mb-lg">
        <div class="discovery-page-head">
            <div class="discovery-page-copy">
                <div class="discovery-page-title">
                    {{ sectionTitle || 'Витрина' }}
                </div>
                <div class="discovery-page-subtitle">
                    Подборки по вашей библиотеке и профилю чтения
                </div>
            </div>

            <q-btn
                class="discovery-refresh-btn"
                color="primary"
                unelevated
                no-caps
                icon="la la-sync"
                :loading="loading"
                @click.stop.prevent="$emit('refresh-shelves')"
            >
                Обновить витрину
            </q-btn>
        </div>

        <div class="discovery-toolbar">
            <q-btn
                unelevated
                no-caps
                class="discovery-toolbar-btn"
                :class="{'discovery-toolbar-btn--active': compactMode}"
                :icon="compactMode ? 'la la-compress-arrows-alt' : 'la la-expand-arrows-alt'"
                @click.stop.prevent="$emit('toggle-compact')"
            >
                {{ compactMode ? 'Обычные карточки' : 'Компактные карточки' }}
            </q-btn>

            <q-btn
                v-if="personalMode"
                unelevated
                no-caps
                class="discovery-toolbar-btn"
                :class="{'discovery-toolbar-btn--active': unreadOnly}"
                :icon="unreadOnly ? 'la la-filter' : 'la la-book-open'"
                @click.stop.prevent="$emit('toggle-unread-only')"
            >
                {{ unreadOnly ? 'Показывать все' : 'Только непрочитанное' }}
            </q-btn>

            <q-btn
                v-if="personalMode"
                unelevated
                no-caps
                class="discovery-toolbar-btn"
                :class="{'discovery-toolbar-btn--active': tasteSetupOpen}"
                icon="la la-sliders-h"
                @click.stop.prevent="toggleTasteSetup"
            >
                Настроить вкусы
            </q-btn>

            <q-select
                v-if="showExternalFilter && externalGenreOptions && externalGenreOptions.length > 1"
                :model-value="externalGenreUrl"
                class="discovery-genre-select"
                dense
                outlined
                emit-value
                map-options
                options-dense
                no-error-icon
                :loading="loading"
                :disable="loading"
                label="Жанр внешней витрины"
                :options="externalGenreOptions"
                @update:model-value="$emit('set-external-genre', $event || '')"
            />

            <div v-if="showExternalPagination && externalPagination" class="discovery-filter-group">
                <q-btn
                    v-for="pageSize in [12, 24, 48]"
                    :key="pageSize"
                    unelevated
                    no-caps
                    class="discovery-toolbar-btn"
                    :class="{'discovery-toolbar-btn--active': externalPagination.perPage === pageSize}"
                    @click.stop.prevent="$emit('set-external-limit', pageSize)"
                >
                    {{ pageSize }}
                </q-btn>

            </div>
        </div>

        <section v-if="showTasteSetup" class="discovery-taste-panel">
            <div class="discovery-taste-copy">
                <div class="discovery-taste-title">Что вам нравится читать?</div>
                <div class="discovery-taste-subtitle">
                    Это особенно помогает новому профилю. Настройки можно изменить в любой момент.
                </div>
            </div>
            <div class="discovery-taste-grid">
                <q-select
                    v-model="tasteGenres"
                    outlined
                    dense
                    multiple
                    use-chips
                    emit-value
                    map-options
                    :options="tasteGenreOptions"
                    label="Любимые жанры"
                />
                <q-input
                    v-model="tasteAuthorsText"
                    outlined
                    dense
                    clearable
                    label="Любимые авторы"
                    hint="Через запятую"
                />
                <q-select
                    v-model="tasteLanguages"
                    outlined
                    dense
                    multiple
                    use-chips
                    emit-value
                    map-options
                    :options="tasteLanguageOptions"
                    label="Языки книг"
                />
                <q-select
                    v-model="tasteExplorationRatio"
                    outlined
                    dense
                    emit-value
                    map-options
                    :options="tasteExplorationOptions"
                    label="Сколько нового пробовать"
                />
            </div>
            <div class="discovery-taste-actions">
                <q-btn color="primary" unelevated no-caps icon="la la-check" @click.stop.prevent="saveTaste">
                    Сохранить вкусы
                </q-btn>
                <q-btn v-if="!personalTasteNeedsSetup" flat no-caps @click.stop.prevent="tasteSetupOpen = false">
                    Закрыть
                </q-btn>
            </div>
        </section>

        <div v-if="loading" class="discovery-loading-line">
            <q-icon class="la la-spinner icon-rotate" size="20px" />
            <span>Собираю витрину...</span>
        </div>

        <div v-if="errorMessage" class="discovery-error">
            {{ errorMessage }}
        </div>

        <section
            v-for="shelf in safeShelves"
            :key="shelf.id || shelf.title"
            class="discovery-shelf"
        >
            <div class="discovery-head">
                <div class="discovery-head-copy">
                    <div class="discovery-kicker">
                        {{ shelfSourceLabel(shelf) }}
                    </div>
                    <div class="discovery-title">
                        {{ shelf.title }}
                    </div>
                    <div v-if="shelf.subtitle" class="discovery-subtitle">
                        {{ shelf.subtitle }}
                    </div>
                    <div class="discovery-meta">
                        <span v-if="shelf.updatedAt">Обновлено {{ formatUpdatedAt(shelf.updatedAt) }}</span>
                        <span v-if="shelf.discoveryStale" class="discovery-meta-warning">Показан кеш</span>
                    </div>
                    <div v-if="shelf.discoveryRefreshError" class="discovery-meta-warning discovery-meta-warning--inline">
                        {{ shelf.discoveryRefreshError }}
                    </div>
                </div>

                <div class="discovery-head-actions">
                    <q-btn
                        v-if="shelf.canHide"
                        class="discovery-source-btn discovery-source-btn--hide"
                        unelevated
                        no-caps
                        icon="la la-eye-slash"
                        @click.stop.prevent="$emit('hide-shelf', shelf.id)"
                    >
                        Скрыть полку
                    </q-btn>

                    <q-btn
                        v-if="shelf.sourceUrl"
                        class="discovery-source-btn"
                        unelevated
                        no-caps
                        icon="la la-external-link-alt"
                        @click.stop.prevent="openSource(shelf)"
                    >
                        Источник
                    </q-btn>
                </div>
            </div>

            <div v-if="shelf.items && shelf.items.length" class="discovery-grid" :class="{'discovery-grid--list': bookCardListMode}">
                <BookView
                    v-for="book in shelf.items"
                    :key="book._uid || `${shelf.id}-${book.id}`"
                    :book="book"
                    mode="extended"
                    :genre-map="genreMap"
                    :show-read-link="showReadLink"
                    :show-discovery-dismiss="!!book.discoveryDismissible"
                    :discovery-dismiss-label="book.discoveryDismissLabel || 'Неинтересно'"
                    :show-discovery-restore="!!book.discoveryRestoreable"
                    :discovery-restore-label="book.discoveryRestoreLabel || 'Вернуть'"
                    :compact-discovery="compactMode"
                    @book-event="bookEvent"
                />
            </div>

            <div v-if="showLoadMore(shelf)" class="discovery-load-more">
                <q-btn
                    class="discovery-source-btn"
                    unelevated
                    no-caps
                    icon="la la-plus-circle"
                    :loading="loading"
                    :disable="loading"
                    @click.stop.prevent="loadMore(shelf)"
                >
                    {{ loadMoreLabel(shelf) }}
                </q-btn>
            </div>

            <div v-if="!shelf.items || !shelf.items.length" class="discovery-empty">
                {{ shelf.emptyMessage || 'Пока пусто.' }}
            </div>
        </section>
    </div>
</template>

<script>
//-----------------------------------------------------------------------------
import vueComponent from '../../vueComponent.js';

import BaseList from '../BaseList';

class DiscoveryShelves extends BaseList {
    _props = {
        sectionTitle: String,
        compactMode: Boolean,
        personalMode: Boolean,
        externalFilter: { type: String, default: 'books'},
        externalGenreOptions: { type: Array, default: () => []},
        externalGenreUrl: { type: String, default: ''},
        showExternalFilter: Boolean,
        externalPagination: Object,
        showExternalPagination: Boolean,
        unreadOnly: Boolean,
        list: Object,
        search: Object,
        extSearch: Object,
        genreMap: Object,
        shelves: Array,
        loading: Boolean,
        errorMessage: String,
    };

    tasteSetupOpen = false;
    tasteLocalCompleted = false;
    tasteGenres = [];
    tasteAuthorsText = '';
    tasteLanguages = [];
    tasteExplorationRatio = 0.15;

    refresh() {
    }

    get personalTasteShelf() {
        return (Array.isArray(this.shelves) ? this.shelves : [])
            .find(shelf => shelf && String(shelf.id || '') === 'similar-books') || {};
    }

    get personalTaste() {
        return (this.personalTasteShelf.discoveryTaste && typeof(this.personalTasteShelf.discoveryTaste) === 'object'
            ? this.personalTasteShelf.discoveryTaste
            : {});
    }

    get personalTasteNeedsSetup() {
        return this.personalTasteShelf.discoveryNeedsTasteSetup === true && !this.tasteLocalCompleted;
    }

    get showTasteSetup() {
        return !!(this.personalMode && (this.tasteSetupOpen || this.personalTasteNeedsSetup));
    }

    get tasteGenreOptions() {
        const entries = (this.genreMap instanceof Map ? Array.from(this.genreMap.entries()) : Object.entries(this.genreMap || {}));
        return entries
            .map(([value, label]) => ({value: String(value || '').trim(), label: String(label || value || '').trim()}))
            .filter(item => item.value && item.label)
            .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
    }

    get tasteLanguageOptions() {
        return [
            {label: 'Русский', value: 'ru'},
            {label: 'Английский', value: 'en'},
            {label: 'Украинский', value: 'uk'},
            {label: 'Немецкий', value: 'de'},
            {label: 'Французский', value: 'fr'},
            {label: 'Испанский', value: 'es'},
            {label: 'Итальянский', value: 'it'},
        ];
    }

    get tasteExplorationOptions() {
        return [
            {label: 'Осторожно · 10%', value: 0.1},
            {label: 'Сбалансированно · 15%', value: 0.15},
            {label: 'Больше нового · 25%', value: 0.25},
        ];
    }

    syncTasteEditor() {
        const taste = this.personalTaste;
        this.tasteGenres = Array.isArray(taste.genres) ? taste.genres.slice() : [];
        this.tasteAuthorsText = (Array.isArray(taste.authors) ? taste.authors : []).join(', ');
        this.tasteLanguages = Array.isArray(taste.languages) ? taste.languages.slice() : [];
        this.tasteExplorationRatio = Number(taste.explorationRatio) || 0.15;
    }

    toggleTasteSetup() {
        this.tasteSetupOpen = !this.tasteSetupOpen;
        if (this.tasteSetupOpen)
            this.syncTasteEditor();
    }

    saveTaste() {
        const authors = String(this.tasteAuthorsText || '')
            .split(/[,;\n]/)
            .map(item => item.replace(/\s+/g, ' ').trim())
            .filter(Boolean);
        this.$emit('save-taste', {
            genres: this.tasteGenres,
            authors,
            languages: this.tasteLanguages,
            explorationRatio: this.tasteExplorationRatio,
            completedAt: new Date().toISOString(),
        });
        this.tasteLocalCompleted = true;
        this.tasteSetupOpen = false;
    }

    bookEvent(event) {
        if (event && event.action === 'discoveryFeedback') {
            this.$emit('feedback-book', {
                book: event.book,
                kind: event.format || 'not_interested',
            });
            return;
        }

        if (event && event.action === 'discoveryDismiss') {
            this.$emit('dismiss-book', event.book);
            return;
        }

        if (event && event.action === 'discoveryRestore') {
            this.$emit('restore-book', event.book);
            return;
        }

        const interactionTypes = {
            bookInfo: 'open',
            readBook: 'start',
            readingList: 'save',
            download: 'download',
        };
        if (event && interactionTypes[event.action] && event.book && event.book.discoveryShelfId) {
            this.$emit('discovery-interaction', {
                book: event.book,
                type: interactionTypes[event.action],
            });
        }

        super.bookEvent(event);
    }

    loadMore(shelf = {}) {
        if (String(shelf.id || '') === 'similar-books') {
            this.$emit('load-more-recommendations');
            return;
        }

        this.$emit('load-more-external');
    }

    get safeShelves() {
        return (Array.isArray(this.shelves) ? this.shelves : []);
    }

    showLoadMore(shelf = {}) {
        const isExternalMore = !!(
            this.showExternalPagination
            && this.externalPagination
            && this.externalPagination.canNext
            && shelf
            && shelf.source === 'external'
            && Array.isArray(shelf.items)
            && shelf.items.length
        );

        const isSimilarMore = !!(
            this.personalMode
            && shelf
            && String(shelf.id || '') === 'similar-books'
            && shelf.discoveryHasMore === true
            && Array.isArray(shelf.items)
            && shelf.items.length
        );

        return isExternalMore || isSimilarMore;
    }

    loadMoreLabel(shelf = {}) {
        if (String(shelf.id || '') === 'similar-books')
            return 'Ещё рекомендации';
        return 'Загрузить ещё';
    }

    shelfSourceLabel(shelf = {}) {
        if (shelf.sourceName)
            return shelf.sourceName;
        if (shelf.source === 'external')
            return 'Внешний источник';
        return 'Локальная библиотека';
    }

    formatUpdatedAt(value) {
        const date = new Date(Number(value) || value);
        if (Number.isNaN(date.getTime()))
            return '';

        return date.toLocaleString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        });
    }

    openSource(shelf = {}) {
        if (shelf.sourceUrl)
            window.open(shelf.sourceUrl, '_blank');
    }
}

export default vueComponent(DiscoveryShelves);
//-----------------------------------------------------------------------------
</script>

<style scoped>
.discovery-wrap {
    position: relative;
}

.discovery-page-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 18px;
}

.discovery-page-copy {
    min-width: 0;
}

.discovery-page-title {
    color: var(--app-text);
    font-size: 32px;
    font-weight: 800;
    line-height: 1.05;
}

.discovery-page-subtitle {
    margin-top: 6px;
    color: var(--app-muted);
    font-size: 14px;
    font-weight: 600;
}

.discovery-refresh-btn {
    flex-shrink: 0;
}

.discovery-toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 14px;
}

.discovery-filter-group {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 8px;
}

.discovery-toolbar-btn {
    color: var(--app-text);
    border: 1px solid color-mix(in srgb, var(--app-border) 78%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--app-surface) 88%, var(--app-surface-2) 12%);
    box-shadow: 0 1px 0 color-mix(in srgb, var(--app-surface-3) 30%, white 70%) inset;
    font-weight: 600;
}

.discovery-toolbar-btn:hover {
    background: color-mix(in srgb, var(--app-surface) 72%, var(--app-surface-2) 28%);
    border-color: color-mix(in srgb, var(--app-border) 92%, var(--app-primary) 8%);
}

.discovery-toolbar-btn--active {
    color: color-mix(in srgb, var(--app-text) 82%, var(--app-primary) 18%);
    border-color: color-mix(in srgb, var(--app-border) 58%, var(--app-primary) 42%);
    background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--app-surface-2) 84%, var(--app-primary) 16%) 0%,
        color-mix(in srgb, var(--app-surface) 82%, var(--app-primary) 18%) 100%
    );
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--app-primary) 22%, transparent) inset;
}

.discovery-genre-select {
    min-width: 220px;
}

.discovery-genre-select :deep(.q-field__control) {
    border-radius: 14px;
    background: color-mix(in srgb, var(--app-surface) 90%, var(--app-surface-2) 10%);
}

.discovery-error {
    margin-bottom: 16px;
    padding: 14px 16px;
    border: 1px solid rgba(194, 88, 62, 0.28);
    border-radius: 18px;
    background: rgba(194, 88, 62, 0.08);
    color: var(--app-text);
    font-weight: 600;
}

.discovery-taste-panel {
    margin-bottom: 22px;
    padding: 18px;
    border: 1px solid color-mix(in srgb, var(--app-primary) 28%, var(--app-border) 72%);
    border-radius: 20px;
    background: linear-gradient(135deg, color-mix(in srgb, var(--app-surface) 88%, var(--app-primary) 12%), var(--app-surface));
}

.discovery-taste-title {
    color: var(--app-text);
    font-size: 18px;
    font-weight: 800;
}

.discovery-taste-subtitle {
    margin-top: 4px;
    color: var(--app-muted);
    font-size: 13px;
    font-weight: 600;
}

.discovery-taste-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin-top: 16px;
}

.discovery-taste-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 14px;
}

.discovery-loading-line {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
    color: var(--app-muted);
    font-weight: 700;
}

.discovery-shelf + .discovery-shelf {
    margin-top: 26px;
}

.discovery-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
}

.discovery-head-copy {
    min-width: 0;
}

.discovery-head-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
}

.discovery-kicker {
    color: var(--app-muted);
    font-size: 12px;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
}

.discovery-title {
    margin-top: 4px;
    color: var(--app-text);
    font-size: 28px;
    font-weight: 800;
    line-height: 1.05;
}

.discovery-subtitle {
    margin-top: 6px;
    color: var(--app-muted);
    font-size: 14px;
    line-height: 1.35;
}

.discovery-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin-top: 8px;
    color: var(--app-muted);
    font-size: 13px;
    font-weight: 600;
}

.discovery-meta-warning {
    color: #a5522d;
}

.discovery-meta-warning--inline {
    margin-top: 6px;
    font-size: 13px;
    font-weight: 600;
}

.discovery-source-btn {
    flex-shrink: 0;
    color: var(--app-text);
    border: 1px solid color-mix(in srgb, var(--app-border) 78%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--app-surface) 88%, var(--app-surface-2) 12%);
    font-weight: 600;
}

.discovery-source-btn:hover {
    border-color: color-mix(in srgb, var(--app-border) 92%, var(--app-primary) 8%);
    background: color-mix(in srgb, var(--app-surface) 72%, var(--app-surface-2) 28%);
}

.discovery-source-btn--hide {
    color: color-mix(in srgb, var(--app-text) 74%, var(--app-danger) 26%);
    border-color: color-mix(in srgb, var(--app-border) 66%, var(--app-danger) 34%);
    background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--app-surface-2) 84%, var(--app-danger) 16%) 0%,
        color-mix(in srgb, var(--app-surface) 86%, var(--app-danger) 14%) 100%
    );
}

.discovery-source-btn--hide:hover {
    border-color: color-mix(in srgb, var(--app-border) 54%, var(--app-danger) 46%);
    background: linear-gradient(
        180deg,
        color-mix(in srgb, var(--app-surface-2) 74%, var(--app-danger) 26%) 0%,
        color-mix(in srgb, var(--app-surface) 78%, var(--app-danger) 22%) 100%
    );
}

.discovery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 18px;
    align-items: stretch;
}

.discovery-grid--list {
    grid-template-columns: 1fr;
    gap: 8px;
}

.discovery-load-more {
    display: flex;
    justify-content: center;
    margin-top: 18px;
}

.discovery-empty {
    padding: 16px 18px;
    border: 1px dashed var(--app-border);
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.44);
    color: var(--app-muted);
    font-size: 14px;
    font-weight: 600;
}

@media (max-width: 760px) {
    .discovery-wrap {
        margin-top: 10px;
    }

    .discovery-page-head {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
    }

    .discovery-head {
        flex-direction: column;
        align-items: stretch;
        gap: 10px;
    }

    .discovery-page-title {
        font-size: 24px;
    }

    .discovery-title {
        font-size: 22px;
    }

    .discovery-taste-grid {
        grid-template-columns: 1fr;
    }

    .discovery-grid {
        grid-template-columns: 1fr;
        gap: 12px;
    }
}
</style>
