//! Test de couches (D12) : les dépendances internes de chaque crate du workspace, lues dans
//! `cargo metadata`, sont exactement celles de la matrice ci-dessous. Une crate ajoutée au
//! workspace sans entrée dans la matrice fait aussi échouer le test.

use std::collections::{BTreeMap, BTreeSet};
use std::error::Error;
use std::process::Command;

use cms_core as _;
use serde_json::Value;

/// Crate → dépendances internes autorisées (dépendances normales, hors dev et build).
const COUCHES: &[(&str, &[&str])] = &[
    ("cms-core", &[]),
    ("cms-app", &["cms-core"]),
    ("cms-html", &["cms-core"]),
    ("cms-worker", &["cms-app", "cms-core", "cms-html"]),
    ("cms-xtask", &["cms-core"]),
];

type Couches = BTreeMap<String, BTreeSet<String>>;

fn texte<'a>(v: &'a Value, cle: &str) -> Result<&'a str, String> {
    v[cle]
        .as_str()
        .ok_or_else(|| format!("clé `{cle}` absente de cargo metadata"))
}

fn liste<'a>(v: &'a Value, cle: &str) -> Result<&'a Vec<Value>, String> {
    v[cle]
        .as_array()
        .ok_or_else(|| format!("liste `{cle}` absente de cargo metadata"))
}

fn dependances_internes() -> Result<Couches, Box<dyn Error>> {
    let cargo = std::env::var("CARGO").unwrap_or_else(|_| "cargo".to_owned());
    let sortie = Command::new(cargo)
        .args(["metadata", "--format-version", "1", "--no-deps"])
        .output()?;
    if !sortie.status.success() {
        return Err(String::from_utf8_lossy(&sortie.stderr).into());
    }
    let meta: Value = serde_json::from_slice(&sortie.stdout)?;
    let paquets = liste(&meta, "packages")?;
    let membres = paquets
        .iter()
        .map(|p| texte(p, "name"))
        .collect::<Result<BTreeSet<_>, _>>()?;

    let mut couches = Couches::new();
    for paquet in paquets {
        let mut internes = BTreeSet::new();
        for dep in liste(paquet, "dependencies")? {
            let nom = texte(dep, "name")?;
            if dep["kind"].is_null() && membres.contains(nom) {
                internes.insert(nom.to_owned());
            }
        }
        couches.insert(texte(paquet, "name")?.to_owned(), internes);
    }
    Ok(couches)
}

#[test]
fn chaque_crate_respecte_sa_couche() -> Result<(), Box<dyn Error>> {
    let attendu: Couches = COUCHES
        .iter()
        .map(|(c, deps)| {
            (
                (*c).to_owned(),
                deps.iter().map(|d| (*d).to_owned()).collect(),
            )
        })
        .collect();
    assert_eq!(dependances_internes()?, attendu);
    Ok(())
}
