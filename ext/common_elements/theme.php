<?php

declare(strict_types=1);

namespace Shimmie2;

use MicroHTML\HTMLElement;

use function MicroHTML\{A,B,BR,IMG,emptyHTML,joinHTML,LINK};

class CommonElementsTheme extends Themelet
{
    public function build_tag(
        string $tag,
        bool $show_underscores = true,
        bool $show_category = true,
        ?string $style = null,
    ): HTMLElement {
        $props = [
            "href" => search_link([$tag]),
            "class" => "tag",
            "style" => $style,
            "title" => "View all posts tagged $tag"
        ];
        $body = $tag;

        if (Extension::is_enabled(TagCategoriesInfo::KEY)) {
            $category = TagCategories::get_tag_category($tag);
            if (!is_null($category)) {
                $tag_category_dict = TagCategories::getKeyedDict();
                $props["class"] = "tag tag_category_$category";
                $props["style"] = "color:".$tag_category_dict[$category]['color'].";";

                if ($show_category === false) {
                    $body = TagCategories::get_tag_body($tag);
                }
            }
        }

        $body = $show_underscores ? $body : str_replace("_", " ", $body);

        return A($props, $body);
    }

    /**
     * Generic thumbnail code; returns HTML rather than adding
     * a block since thumbs tend to go inside blocks...
     */
    public function build_thumb(Image $image): HTMLElement
    {
        global $config;

        $id = $image->id;
        $view_link = make_link('post/view/'.$id);
        $thumb_link = $image->get_thumb_link();
        $tip = $image->get_tooltip();
        $tags = strtolower($image->get_tag_list());

        // TODO: Set up a function for fetching what kind of files are currently thumbnailable
        $mimeArr = array_flip([MimeType::MP3]); //List of thumbless filetypes
        if (!isset($mimeArr[$image->get_mime()])) {
            $tsize = get_thumbnail_size($image->width, $image->height);
        } else {
            //Use max thumbnail size if using thumbless filetype
            $tsize = get_thumbnail_size($config->get_int(ImageConfig::THUMB_WIDTH), $config->get_int(ImageConfig::THUMB_WIDTH));
        }

        $custom_classes = "";
        if (Extension::is_enabled(RelationshipsInfo::KEY)) {
            if ($image['parent_id'] !== null) {
                $custom_classes .= "shm-thumb-has_parent ";
            }
            if ($image['has_children']) {
                $custom_classes .= "shm-thumb-has_child ";
            }
        }
        if (Extension::is_enabled(RatingsInfo::KEY) && Extension::is_enabled(RatingsBlurInfo::KEY)) {
            $rb = new RatingsBlur();
            if ($rb->blur($image['rating'])) {
                $custom_classes .= "blur ";
            }
        }

        $attrs = [
            "href" => $view_link,
            "class" => "thumb shm-thumb shm-thumb-link $custom_classes",
            "data-tags" => $tags,
            "data-height" => $image->height,
            "data-width" => $image->width,
            "data-mime" => $image->get_mime(),
            "data-post-id" => $id,
        ];
        if (Extension::is_enabled(RatingsInfo::KEY)) {
            $attrs["data-rating"] = $image['rating'];
        }

        return A(
            $attrs,
            IMG(
                [
                    "id" => "thumb_$id",
                    "title" => $tip,
                    "alt" => $tip,
                    "height" => $tsize[1],
                    "width" => $tsize[0],
                    "src" => $thumb_link,
                ]
            )
        );
    }

    public function display_paginator(Page $page, string $base, ?string $query, int $page_number, int $total_pages, bool $show_random = false): void
    {
        if ($total_pages == 0) {
            $total_pages = 1;
        }
        $body = $this->build_paginator($page_number, $total_pages, $base, $query, $show_random);
        $page->add_block(new Block(null, $body, "main", 90, "paginator"));

        $page->add_html_header(LINK(['rel' => 'first', 'href' => make_link($base.'/1', $query)]));
        if ($page_number < $total_pages) {
            $page->add_html_header(LINK(['rel' => 'prefetch', 'href' => make_link($base.'/'.($page_number + 1), $query)]));
            $page->add_html_header(LINK(['rel' => 'next', 'href' => make_link($base.'/'.($page_number + 1), $query)]));
        }
        if ($page_number > 1) {
            $page->add_html_header(LINK(['rel' => 'previous', 'href' => make_link($base.'/'.($page_number - 1), $query)]));
        }
        $page->add_html_header(LINK(['rel' => 'last', 'href' => make_link($base.'/'.$total_pages, $query)]));
    }

    private function gen_page_link(string $base_url, ?string $query, int $page, string $name): HTMLElement
    {
        return A(["href" => make_link($base_url.'/'.$page, $query)], $name);
    }

    private function gen_page_link_block(string $base_url, ?string $query, int $page, int $current_page, string $name): HTMLElement
    {
        $paginator = $this->gen_page_link($base_url, $query, $page, $name);
        if ($page == $current_page) {
            $paginator = B($paginator);
        }
        return $paginator;
    }

    private function build_paginator(int $current_page, int $total_pages, string $base_url, ?string $query, bool $show_random): HTMLElement
    {
        $next = $current_page + 1;
        $prev = $current_page - 1;

        $at_start = ($current_page <= 1 || $total_pages <= 1);
        $at_end = ($current_page >= $total_pages);

        $first_html  = $at_start ? "First" : $this->gen_page_link($base_url, $query, 1, "First");
        $prev_html   = $at_start ? "Prev" : $this->gen_page_link($base_url, $query, $prev, "Prev");

        $random_html = "-";
        if ($show_random) {
            $rand = mt_rand(1, $total_pages);
            $random_html =                   $this->gen_page_link($base_url, $query, $rand, "Random");
        }

        $next_html   = $at_end ? "Next" : $this->gen_page_link($base_url, $query, $next, "Next");
        $last_html   = $at_end ? "Last" : $this->gen_page_link($base_url, $query, $total_pages, "Last");

        $start = max($current_page - 5, 1);
        $end = min($start + 10, $total_pages);

        $pages = [];
        foreach (range($start, $end) as $i) {
            $pages[] = $this->gen_page_link_block($base_url, $query, $i, $current_page, (string)$i);
        }
        $pages_html = joinHTML(" | ", $pages);

        return emptyHTML(
            joinHTML(" | ", [
                $first_html,
                $prev_html,
                $random_html,
                $next_html,
                $last_html,
            ]),
            BR(),
            '<< ',
            $pages_html,
            ' >>'
        );
    }
}
